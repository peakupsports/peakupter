# Sharetribe Console — Teams setup

PeakUp merges local team config in code (`configPeakUpTeamUserFields.js`, `peakUpTeamUserTypes`). For production, mirror these in Sharetribe Console:

## User type

Add to **Build → Users → User types**:

- **ID:** `team`
- **Label:** Team / Club
- **Roles:** Provider (only)

## User extended data (optional duplicate in Console)

Keys used by the app (also merged locally):

- `teamTagline`, `teamBio`, `teamSports`, `teamCityText`, `teamFoundedYear`, `teamWebsite`, `teamInstagram`, `teamCoachCount`
- Profile settings (team user type): crew picture, founded year, about crew, links; full sports/languages section retained; coach map/meeting points hidden
- Profile photo = cinematic hero + logo badge on the team page
- Coach verification stays per-coach (HQ approves each coach individually)
- `peakupTeamMemberIds` (array of coach user UUIDs — write via `/api/team-roster` only)
- `peakupVerifiedTeam`, `teamApproved`, `teamApprovedAt`

## Coach affiliation (on coach users)

- `peakupAffiliatedTeamId`, `peakupAffiliationStatus`, `peakupAffiliatedTeamName`

## Listings

Teams reuse the same hourly `default-booking` listing type as coaches. Optional flag:

- `peakupTeamListing: true` on team listings for filtering/analytics

Payouts go to the **team** Sharetribe user (listing author), not roster coaches.
