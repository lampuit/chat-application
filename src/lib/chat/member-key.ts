export function buildDirectMemberKey(userA: string, userB: string) {
  return [userA, userB].sort().join("_");
}

