#!/usr/bin/env python3
"""One-off: translate featured_github_prs from REST issue ids to PR URLs.

The KIS-185 GraphQL engine can't see REST issue ids (GraphQL exposes the PR
database id, a different table), so curation is re-keyed to the PR URL —
the identifier both APIs return verbatim.

Usage:
  GITHUB_TOKEN=... python3 scripts/migrate-featured-to-urls.py local
  GITHUB_TOKEN=... SUPABASE_ACCESS_TOKEN=... python3 scripts/migrate-featured-to-urls.py prod

Idempotent: values already shaped like PR URLs pass through untouched.
Unmappable ids (PR gone from search, or past the 1000-result cap) are
dropped with a report line — they could never render again anyway.
"""

import json
import os
import subprocess
import sys
import time
import urllib.parse
import urllib.request

PROD_PROJECT_REF = "fwaikexukvjlfudvyrgk"
LOCAL_DB = ["docker", "exec", "supabase_db_my-pr", "psql", "-U", "postgres", "-d", "postgres", "-tA"]


def run_sql(target: str, query: str):
    if target == "local":
        out = subprocess.run(
            LOCAL_DB + ["-c", query], capture_output=True, text=True
        )
        if out.returncode != 0:
            raise RuntimeError(out.stderr)
        return out.stdout.strip()
    token = os.environ["SUPABASE_ACCESS_TOKEN"]
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROD_PROJECT_REF}/database/query",
        data=json.dumps({"query": query}).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "content-type": "application/json",
            "User-Agent": "myprs-migration",
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())


def fetch_pr_url_map(username: str) -> dict[str, str]:
    """REST search: issue id -> html_url for the user's merged PRs."""
    token = os.environ["GITHUB_TOKEN"]
    mapping: dict[str, str] = {}
    for page in range(1, 11):
        q = urllib.parse.quote(f"author:{username} type:pr is:public is:merged")
        req = urllib.request.Request(
            f"https://api.github.com/search/issues?q={q}&per_page=100&page={page}",
            headers={"Authorization": f"Bearer {token}", "User-Agent": "myprs-migration"},
        )
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read())
        for item in data.get("items", []):
            mapping[str(item["id"])] = item["html_url"]
        if page * 100 >= min(data.get("total_count", 0), 1000):
            break
        time.sleep(2.5)  # stay under the 30/min search pool
    return mapping


def get_rows(target: str):
    query = (
        "select github_username, featured_github_prs from users "
        "where featured_github_prs is not null and array_length(featured_github_prs,1) > 0"
    )
    if target == "local":
        out = run_sql(
            target,
            "select json_agg(json_build_object('github_username', github_username, "
            "'featured_github_prs', featured_github_prs)) from users "
            "where featured_github_prs is not null and array_length(featured_github_prs,1) > 0",
        )
        return json.loads(out) if out else []
    return run_sql(target, query)


def update_row(target: str, username: str, urls: list[str]):
    array_sql = "array[" + ",".join("'" + u.replace("'", "''") + "'" for u in urls) + "]::text[]"
    if not urls:
        array_sql = "array[]::text[]"
    query = (
        f"update users set featured_github_prs = {array_sql} "
        f"where github_username = '{username}'"
    )
    run_sql(target, query)


def main():
    target = sys.argv[1] if len(sys.argv) > 1 else ""
    if target not in ("local", "prod"):
        sys.exit("usage: migrate-featured-to-urls.py local|prod")

    rows = get_rows(target)
    print(f"{len(rows)} user(s) with featured PRs on {target}")
    for row in rows:
        username = row["github_username"]
        current = row["featured_github_prs"]
        if all(v.startswith("https://github.com/") for v in current):
            print(f"  {username}: already migrated ({len(current)} urls)")
            continue
        mapping = fetch_pr_url_map(username)
        translated, dropped = [], []
        for value in current:
            if value.startswith("https://github.com/"):
                translated.append(value)
            elif value in mapping:
                translated.append(mapping[value])
            else:
                dropped.append(value)
        update_row(target, username, translated)
        note = f", dropped {dropped}" if dropped else ""
        print(f"  {username}: {len(current)} ids -> {len(translated)} urls{note}")
        time.sleep(2.5)


if __name__ == "__main__":
    main()
