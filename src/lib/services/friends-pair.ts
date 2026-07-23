export function canonicalFriendPair(userA: string, userB: string) {
  return userA < userB
    ? { userLow: userA, userHigh: userB }
    : { userLow: userB, userHigh: userA };
}

export function inviteCodeFromPartyId(partyId: string) {
  return partyId.replace(/-/g, "").slice(0, 8).toUpperCase();
}
