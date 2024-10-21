export interface Match {
  matcher_user_id: string;
  matched_user_id: string;
  both_matched: boolean;
  match_time: Date;
}

export interface BlockedUser {
  block_id: string;
  blocker_user_id: string;
  blocked_user_id: string;
  block_time: Date;
}

export interface UserReport {
  report_id: string;
  reporter_user_id: string;
  reported_user_id: string;
  report_reason: string;
  report_time: Date;
}
