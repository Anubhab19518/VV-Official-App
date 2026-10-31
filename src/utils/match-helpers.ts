import { OfficialMatch } from '@/types/api';

export function getTeamAName(match?: OfficialMatch | null): string {
  if (!match) return 'Team A';
  return match.teamA?.name || match.teamAName || match.team1?.name || 'Team A';
}

export function getTeamBName(match?: OfficialMatch | null): string {
  if (!match) return 'Team B';
  return match.teamB?.name || match.teamBName || match.team2?.name || 'Team B';
}

export function getTeamAShort(match?: OfficialMatch | null): string {
  if (!match) return 'TMA';
  if (match.teamA?.shortName) return match.teamA.shortName;
  if (match.team1?.shortName) return match.team1.shortName;
  const name = getTeamAName(match);
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
}

export function getTeamBShort(match?: OfficialMatch | null): string {
  if (!match) return 'TMB';
  if (match.teamB?.shortName) return match.teamB.shortName;
  if (match.team2?.shortName) return match.team2.shortName;
  const name = getTeamBName(match);
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
}

export function getTeamALogo(match?: OfficialMatch | null): string | null {
  return match?.teamA?.logoUrl || match?.team1?.logoUrl || null;
}

export function getTeamBLogo(match?: OfficialMatch | null): string | null {
  return match?.teamB?.logoUrl || match?.team2?.logoUrl || null;
}

export function getVenueText(match?: OfficialMatch | null): string {
  if (!match) return 'SAI Kolkata';
  const venueObj = typeof match.venue === 'object' && match.venue !== null ? match.venue : null;
  const name = venueObj?.name || match.venueName || (typeof match.venue === 'string' ? match.venue : null);
  const city = venueObj?.city;
  if (name && city) return `${name}, ${city}`;
  if (name) return name;
  return 'SAI Kolkata';
}

export function getTournamentName(match?: OfficialMatch | null): string {
  if (!match) return 'Tournament';
  return match.tournament?.name || match.tournamentName || 'Cricket Tournament';
}

export function getFormattedSchedule(match?: OfficialMatch | null): string {
  if (!match) return 'Scheduled';
  if (match.date && match.time) {
    return `${match.date} • ${match.time}`;
  }
  if (match.scheduledTime) {
    const d = new Date(match.scheduledTime);
    if (!isNaN(d.getTime())) {
      const datePart = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${datePart} • ${timePart}`;
    }
  }
  return 'Scheduled';
}

export function getUmpireRole(match?: OfficialMatch | null): string {
  if (!match) return 'MAIN';
  return match.umpireRole || match.role || 'MAIN';
}

export function formatPlayerPosition(pos?: string | string[]): string {
  if (!pos) return 'All-rounder';
  const raw = Array.isArray(pos) ? pos[0] : pos;
  if (!raw) return 'All-rounder';
  const clean = String(raw).replace(/_/g, ' ').toLowerCase();
  return clean.replace(/\b\w/g, (c) => c.toUpperCase());
}

