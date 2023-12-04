import { NextResponse } from "next/server";
import { jwtDecrypt } from "jose";
import { BW_SECRET_KEY } from "@/tools/tokens";
import { fetcher } from "@/tools/fetch";
import createClient from "@/supabase/server";

export const revalidate = 0;

export async function POST(request: Request) {
  const body = await request.json();

  const supabase = createClient();

  const {
    data: { user: user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return NextResponse.json({ error: userError });
  }

  const { payload: zeaburApiToken } = await jwtDecrypt(
    user?.user_metadata["zeaburApiToken"],
    BW_SECRET_KEY,
  );

  const { data, error } = await supabase
    .from("projects")
    .select("zeabur_env_id, zeabur_service_id")
    .eq("id", body.projectId)
    .single();

  if (error) {
    return NextResponse.json({ error });
  }

  const { payload: zeaburEnvId } = await jwtDecrypt(
    data.zeabur_env_id,
    BW_SECRET_KEY,
  );

  const { payload: zeaburServiceId } = await jwtDecrypt(
    data.zeabur_service_id,
    BW_SECRET_KEY,
  );

  const { payload: value } = await jwtDecrypt(body.value, BW_SECRET_KEY);

  const { payload: vx } = await jwtDecrypt(body.vars, BW_SECRET_KEY);

  const vars: any[] =
    vx?.data.vars.filter((varx: any) => varx.key != body.key.key) || [];

  let allVars = "";

  vars.length != 0
    ? vars.map((v: any) => {
        allVars += `${v.key}: "${v.value}"\n`;
      })
    : null;

  const updateVar = await fetcher("https://gateway.zeabur.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${zeaburApiToken.data}`,
    },
    body: JSON.stringify({
      query: `
        mutation {
          updateEnvironmentVariable(
            environmentID: "${zeaburEnvId.data}"
            serviceID: "${zeaburServiceId.data}"
            data: {
              ${allVars}
              ${body.key.key}: "${value.data}"
            }
          )
        }
      `,
    }),
  });

  if (updateVar.errors) {
    return NextResponse.json({ error: updateVar.errors[0].message });
  }

  return NextResponse.json({
    message: "Success",
  });
}
