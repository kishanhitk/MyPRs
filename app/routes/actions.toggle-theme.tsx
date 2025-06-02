import { parse } from "@conform-to/zod";
import { type ActionFunctionArgs, data } from "react-router";
import { ThemeFormSchema } from "~/utils/theme";
import { setTheme } from "~/utils/theme.server";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const submission = parse(formData, {
    schema: ThemeFormSchema,
  });
  if (submission.intent !== "submit") {
    return data({ status: "idle", submission } as const);
  }
  if (!submission.value) {
    return data({ status: "error", submission } as const, { status: 400 });
  }
  const { theme } = submission.value;

  const responseInit = {
    headers: { "set-cookie": setTheme(theme) },
  };
  return data({ success: true, submission }, responseInit);
}
