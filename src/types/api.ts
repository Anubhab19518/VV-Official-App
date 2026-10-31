export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  message?: string;
}

export interface UserProfiles {
  player?: boolean;
  organizer?: boolean;
  umpire?: boolean;
  official?: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  authProvider?: string;
  profiles?: UserProfiles;
  roles?: string[];
  officialProfile?: OfficialProfile | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface SendOtpResponse {
  message: string;
  email: string;
  otp?: string;
}

export type OfficialLevel = 'AMATEUR' | 'PROFESSIONAL';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface OfficialProfile {
  id: string;
  userId: string;
  preferredSportId: string;
  level: OfficialLevel;
  certificateUrl?: string | null;
  certificateNumber?: string | null;
  experienceYears: number;
  verificationStatus: VerificationStatus;
  user?: User;
  createdAt?: string;
  updatedAt?: string;
}

export interface SportRegistryItem {
  sportId: string;
  sportName: string;
  validRoles: string[];
  defaultRole: string;
  singleOccupancyRoles: string[];
  requiresCertificateForPro: boolean;
}

export type SportRegistry = Record<string, SportRegistryItem>;

export interface RegisterOfficialPayload {
  preferredSportId: string;
  level: OfficialLevel;
  certificateUrl?: string | null;
  certificateNumber?: string | null;
  experienceYears: number;
}

export interface TournamentInvitation {
  id: string;
  type?: string;
  sourceId?: string;
  targetUserId?: string;
  tournamentId?: string;
  officialId?: string;
  userId?: string;
  role?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  metadata?: any;
  tournament?: {
    id: string;
    name: string;
    sportId?: string;
    startDate?: string;
    endDate?: string;
    venue?: string;
    location?: string;
    organizer?: {
      id?: string;
      name?: string;
    };
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface OfficialTournament {
  id: string;
  name: string;
  sportId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  venue?: string;
  location?: string;
  organizer?: {
    id?: string;
    name?: string;
  };
}

export interface MatchTeam {
  id: string;
  name: string;
  shortName?: string;
  logoUrl?: string | null;
}

export interface MatchVenue {
  id?: string;
  name?: string;
  city?: string;
}

export interface TournamentRules {
  format?: 'T20' | 'ODI' | 'TEST' | 'CUSTOM';
  oversPerInnings?: number | null;
  maxOversPerInnings?: number | null;
  maxOversPerBowler?: number | null;
  ballsPerOver?: number;
  playersPerTeam?: number;
  powerplayOvers?: number;
  dlsEnabled?: boolean;
  enableDls?: boolean;
  superOverEnabled?: boolean;
  days?: number;
  oversPerDay?: number;
  enforceBowlerLimitInTest?: boolean;
  followOnThreshold?: number;
  allowDeclarations?: boolean;
}

export interface InningsDelivery {
  overNumber: number;
  ballNumber: number;
  bowlerId: string;
  batterId: string;
  nonStrikerId?: string;
  runsBatter: number;
  runsExtra: number;
  extraType: string;
  isWicket: boolean;
  dismissalType?: string | null;
  dismissedPlayerId?: string | null;
}

export interface InningsScorecardData {
  id: string;
  inningsNumber: number;
  battingTeamId: string;
  bowlingTeamId: string;
  totalRuns: number;
  totalWickets: number;
  totalOvers: string | number;
  runs?: number;
  wickets?: number;
  overs?: string | number;
  runRate: number;
  extras?: { wides: number; noBalls: number; byes: number; legByes: number; penalty?: number };
  batters?: any[];
  bowlers?: any[];
  isCompleted?: boolean;
  isDeclared?: boolean;
  declared?: boolean;
  currentBowlerId?: string | null;
  previousBowlerId?: string | null;
  deliveries?: InningsDelivery[];
}

export interface DlsInfoResponse {
  revisedTarget?: number;
  revisedOvers?: number;
  parScore?: number;
  resourcePercentage1?: number;
  resourcePercentage2?: number;
}

export interface MatchScorecard {
  id: string;
  matchId: string;
  currentInnings?: number;
  innings?: InningsScorecardData[];
  rules?: TournamentRules;
  winnerTeamId?: string | null;
  resultSummary?: string | null;
  matchFormat?: 'T20' | 'ODI' | 'TEST' | 'CUSTOM';
  followOnEnforced?: boolean;
  dlsInfo?: DlsInfoResponse;
}

export interface OfficialMatch {
  id: string;
  tournamentId: string;
  tournamentName?: string;
  tournament?: {
    id: string;
    name: string;
    sportType?: string;
    sportId?: string;
  };
  stageId?: string;
  roundNumber?: number;
  matchNumber?: number;
  matchFormat?: 'T20' | 'ODI' | 'TEST' | 'CUSTOM';
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';
  scheduledTime?: string;
  date?: string;
  time?: string;
  umpireRole?: string;
  role?: string;
  teamAId?: string;
  teamBId?: string;
  teamAName?: string;
  teamBName?: string;
  teamA?: MatchTeam;
  teamB?: MatchTeam;
  team1?: MatchTeam;
  team2?: MatchTeam;
  venueId?: string;
  venueName?: string;
  venue?: MatchVenue | string;
  score?: {
    runsA?: number;
    wicketsA?: number;
    oversA?: number | string;
    runsB?: number;
    wicketsB?: number;
    oversB?: number | string;
  };
  resultSummary?: string;
}

export interface RecordDeliveryPayload {
  overNumber?: number;
  ballNumber?: number;
  bowlerId: string;
  batterId: string;
  nonStrikerId?: string | null;
  runsBatter: number;
  runsExtra: number;
  extraType: 'NONE' | 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'PENALTY';
  isWicket: boolean;
  dismissalType?: 'BOWLED' | 'CAUGHT' | 'LBW' | 'RUN_OUT' | 'STUMPED' | 'HIT_WICKET' | 'HANDLED_BALL' | 'OBSTRUCTING_FIELD' | 'TIMED_OUT' | 'RETIRED_HURT' | null;
  dismissedPlayerId?: string | null;
  nextBatterId?: string;
  clientDeliveryId?: string;
}

export interface RecordDlsInterruptionPayload {
  inningsNumber: number;
  oversAtInterruption: number;
  wicketsAtInterruption: number;
  oversLost: number;
  revisedOversTotal: number;
  reason?: string;
}

export interface SubmitResultPayload {
  winnerTeamId?: string | null;
  resultSummary: string;
}

export interface SquadPlayer {
  id: string;
  name: string;
  role?: string;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  positions?: string[];
  avatarUrl?: string | null;
}

export interface SquadTeam {
  id: string;
  name: string;
  shortName?: string;
  players: SquadPlayer[];
}

export interface MatchSquadsData {
  matchId: string;
  tournamentName?: string;
  tournamentStatus?: string;
  canStartMatch: boolean;
  teamA: SquadTeam;
  teamB: SquadTeam;
  lineups?: {
    teamAPlayerIds?: string[];
    teamBPlayerIds?: string[];
  };
  toss?: {
    winnerTeamId?: string | null;
    decision?: 'BAT' | 'BOWL' | null;
    battingTeamId?: string | null;
    bowlingTeamId?: string | null;
  } | null;
}

export interface SetLineupPayload {
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
}

export interface RecordTossPayload {
  tossWinnerTeamId: string;
  tossDecision: 'BAT' | 'BOWL';
}

export interface RecordTossResponse {
  matchId: string;
  status: string;
  tossWinnerTeamId: string;
  tossDecision: 'BAT' | 'BOWL';
  battingTeamId: string;
  bowlingTeamId: string;
}

export interface StartInningsPayload {
  inningsNumber: number;
  battingTeamId: string;
  bowlingTeamId: string;
}

