import { createClient } from "@supabase/supabase-js";

const requiredEnvironment = [
  "SMOKE_SUPABASE_URL",
  "SMOKE_SUPABASE_PUBLISHABLE_KEY",
  "SMOKE_USER_A_ACCESS_TOKEN",
  "SMOKE_USER_B_ACCESS_TOKEN",
];

const missingEnvironment = requiredEnvironment.filter(
  (name) => !process.env[name]?.trim(),
);

if (missingEnvironment.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvironment.join(", ")}`,
  );
  process.exitCode = 1;
} else {
  await runSmokeTest();
}

async function runSmokeTest() {
  const url = process.env.SMOKE_SUPABASE_URL.trim();
  const publishableKey = process.env.SMOKE_SUPABASE_PUBLISHABLE_KEY.trim();
  const userA = await authenticatedTestSubject(
    url,
    publishableKey,
    process.env.SMOKE_USER_A_ACCESS_TOKEN.trim(),
    "user A",
  );
  const userB = await authenticatedTestSubject(
    url,
    publishableKey,
    process.env.SMOKE_USER_B_ACCESS_TOKEN.trim(),
    "user B",
  );

  if (userA.id === userB.id) {
    throw new Error("The smoke test requires two different Auth users.");
  }

  await assertOwnProfileIsOnlyVisibleRow(userA);
  await assertOwnProfileIsOnlyVisibleRow(userB);
  await assertOtherProfileCannotBeSelected(userA, userB.id);
  await assertOtherProfileCannotBeSelected(userB, userA.id);
  await assertOtherProfileCannotBeUpdated(userA, userB);
  await assertOtherProfileCannotBeDeleted(userA, userB);

  console.log(
    "Authentication and cross-user profile isolation smoke test passed.",
  );
}

async function authenticatedTestSubject(
  url,
  publishableKey,
  accessToken,
  label,
) {
  const client = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: claimsData, error: claimsError } =
    await client.auth.getClaims(accessToken);

  if (claimsError || !claimsData?.claims.sub) {
    throw new Error(`${label} access token claims could not be verified.`);
  }

  // This out-of-band smoke check intentionally asks Auth for the current user
  // record as an additional revocation/session check. Routine application SSR
  // authorization uses the verified claims path instead.
  const { data: userData, error: userError } =
    await client.auth.getUser(accessToken);

  if (userError || !userData.user) {
    throw new Error(`${label} access token is invalid or expired.`);
  }

  if (userData.user.id !== claimsData.claims.sub) {
    throw new Error(
      `${label} user record does not match the verified subject.`,
    );
  }

  return { client, id: claimsData.claims.sub, label };
}

async function assertOwnProfileIsOnlyVisibleRow(subject) {
  const { data, error } = await subject.client.from("profiles").select("id");
  assertNoError(error, `${subject.label} profile select`);

  if (data.length !== 1 || data[0].id !== subject.id) {
    throw new Error(`${subject.label} could see a profile it does not own.`);
  }
}

async function assertOtherProfileCannotBeSelected(subject, otherUserId) {
  const { data, error } = await subject.client
    .from("profiles")
    .select("id")
    .eq("id", otherUserId);
  assertNoError(error, `${subject.label} cross-user profile select`);

  if (data.length !== 0) {
    throw new Error(`${subject.label} selected another user's profile.`);
  }
}

async function assertOtherProfileCannotBeUpdated(subject, otherSubject) {
  const before = await readOwnProfile(otherSubject);
  const { data, error } = await subject.client
    .from("profiles")
    .update({ time_zone: "Etc/UTC" })
    .eq("id", otherSubject.id)
    .select("id");
  assertNoError(error, `${subject.label} cross-user profile update`);

  if (data.length !== 0) {
    throw new Error(`${subject.label} updated another user's profile.`);
  }

  const after = await readOwnProfile(otherSubject);
  if (after.time_zone !== before.time_zone) {
    throw new Error("The other user's profile changed after a blocked update.");
  }
}

async function assertOtherProfileCannotBeDeleted(subject, otherSubject) {
  const { data, error } = await subject.client
    .from("profiles")
    .delete()
    .eq("id", otherSubject.id)
    .select("id");

  if (!error && data.length !== 0) {
    throw new Error(`${subject.label} deleted another user's profile.`);
  }

  await readOwnProfile(otherSubject);
}

async function readOwnProfile(subject) {
  const { data, error } = await subject.client
    .from("profiles")
    .select("id, time_zone")
    .eq("id", subject.id)
    .single();
  assertNoError(error, `${subject.label} own-profile verification`);
  return data;
}

function assertNoError(error, operation) {
  if (error) {
    throw new Error(`${operation} failed: ${error.message}`);
  }
}
