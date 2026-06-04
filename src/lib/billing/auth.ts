export const LOCAL_USER_ID = "local-user";

export type LocalUser = {
  id: string;
  email: string;
  user_metadata?: { name?: string };
};

// Single local identity used when the app runs on localhost without auth.
export async function getAuthenticatedUser(): Promise<LocalUser> {
  return { id: LOCAL_USER_ID, email: "local@localhost" };
}
