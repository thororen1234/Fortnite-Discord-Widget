export type Snowflake = string;
export interface GameWidget {
  id: Snowflake;
  updated_at: string;
  data: GameWidgetData;
}
export type GameWidgetType =
  | "favorite_games"
  | "played_games"
  | "current_games"
  | "want_to_play_games"
  | "application";
export interface GameWidgetData {
  type: GameWidgetType;
  games?: GameWidgetGame[];
  application_id?: Snowflake;
}
export interface GameWidgetGame {
  game_id: Snowflake;
  comment?: string | null;
  tags?: GameWidgetTag[];
}
export type GameWidgetTag =
  | "noob"
  | "learning_the_ropes"
  | "casual"
  | "getting_good"
  | "intermediate"
  | "expert"
  | "better_than_you"
  | "obsessed"
  | "love_it"
  | "kind_of_love_it"
  | "kind_of_hate_it"
  | "rage_quitting"
  | "like_it"
  | "frustrated"
  | "too_easy"
  | "looking_for_group"
  | "open_to_play"
  | "looking_for_tips"
  | "open_to_teach"
  | "looking_to_discuss";
export interface UserApplicationIdentity {
  application_id: Snowflake;
  provider_issued_user_id: string;
  profile?: PartialUserApplicationProfile;
  profiles?: PartialUserApplicationProfile[];
}
export interface PartialUserApplicationProfile {
  username?: string | null;
  metadata?: Record<string, string> | null;
  data?: UserApplicationProfileData;
  data_trusted?: boolean;
  connection_visible?: boolean;
}
export interface UserApplicationProfileData {
  primary?: UserApplicationProfilePrimaryData;
  dynamic?: UserApplicationProfileDynamicData[];
}
export interface UserApplicationProfilePrimaryData {
  season?: string;
  rank_name?: string;
  highest_rank?: string;
  featured_played_character?: string;
  featured_played_character_image?: UnfurledMediaItem;
  playtime_hours?: number;
  total_wins?: number;
  current_period_wins?: number;
  total_games?: number;
  current_period_games?: number;
  total_kills?: number;
  current_period_kills?: number;
  total_assists?: number;
  current_period_assists?: number;
  total_deaths?: number;
  current_period_deaths?: number;
  server_name?: string;
  user_id?: string;
  union_level?: string;
  total_resonators?: number;
  total_achievements?: number;
  total_echoes?: number;
  login_days?: number;
  data_bank_level?: string;
}
export interface UnfurledMediaItem {
  url: string;
  width?: number;
  height?: number;
}
export enum DynamicDataType {
  TEXT = 1,
  NUMBER = 2,
  IMAGE = 3,
}
export interface UserApplicationProfileDynamicData {
  type: DynamicDataType;
  name: string;
  value: string | number | DynamicImageValue;
}
export interface DynamicImageValue {
  url: string;
}
export interface WidgetConfig {
  id: Snowflake;
  display_name: string;
  status: "published" | "draft";
  surfaces: Record<string, WidgetSurface>;
}
export type SurfaceType =
  | "widget_top"
  | "widget_bottom"
  | "add_widget_preview"
  | "mini_profile"
  | "activity_accessory";
export interface WidgetSurface {
  layout: string;
  components: Record<string, WidgetSurfaceComponent>;
}
export interface WidgetSurfaceComponent {
  fields: Record<string, WidgetSurfaceComponentField>;
}
export interface WidgetSurfaceComponentField {
  value_type: "data" | "custom_string" | "application_asset" | "application_localized_string";
  presentation_type: "image" | "number" | "text" | "duration";
  value: string;
  fallback?: WidgetSurfaceComponentField;
}
