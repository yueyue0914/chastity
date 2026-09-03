import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

export type UserRole = "wearer" | "keyholder" | "both";

export type UserProfile = {
  userId: string;
  displayName: string;
  role: UserRole;
};

function parseRole(value: string | null | undefined): UserRole {
  if (value === "wearer" || value === "keyholder") return value;
  return "both";
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<UserProfile> => {
    const sql = await getSql();
    const rows = await sql<{
      user_id: string;
      display_name: string;
      role: string;
    }>`
      select user_id, display_name, role from user_profiles
      where user_id = ${context.userId} limit 1
    `;
    if (rows[0]) {
      return {
        userId: rows[0].user_id,
        displayName: rows[0].display_name,
        role: parseRole(rows[0].role),
      };
    }
    await sql`
      insert into user_profiles (user_id, display_name, role)
      values (${context.userId}, '', 'both')
      on conflict (user_id) do nothing
    `;
    return { userId: context.userId, displayName: "", role: "both" };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: { displayName: string; role: UserRole }) => {
      const role: UserRole =
        input.role === "wearer" || input.role === "keyholder"
          ? input.role
          : "both";
      return {
        displayName: String(input.displayName || "").trim().slice(0, 40),
        role,
      };
    },
  )
  .handler(async ({ context, data }): Promise<UserProfile> => {
    const sql = await getSql();
    await sql`
      insert into user_profiles (user_id, display_name, role, updated_at)
      values (${context.userId}, ${data.displayName}, ${data.role}, now())
      on conflict (user_id) do update set
        display_name = excluded.display_name,
        role = excluded.role,
        updated_at = now()
    `;
    return {
      userId: context.userId,
      displayName: data.displayName,
      role: data.role,
    };
  });
