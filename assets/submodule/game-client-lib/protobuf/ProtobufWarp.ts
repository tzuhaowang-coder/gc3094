// tslint:disable-next-line:import-name
import { Message } from 'google-protobuf';
// tslint:disable-next-line:import-name
import any_pb from 'google-protobuf/google/protobuf/any_pb.js';
// tslint:disable-next-line:import-name
import utilities_base_pb from '@circusmonkey/utilities-protobuf/ts/base/base_pb.js';
// tslint:disable-next-line:import-name
import user_pb from 'game-protobuf/ts/account/user_pb.js';
// tslint:disable-next-line:import-name
import gamebase_pb from 'game-protobuf/ts/gamebase/gamebase_pb.js';
// tslint:disable-next-line:import-name
import bonus_pb from 'game-protobuf/ts/extension/bonus_pb.js';
// tslint:disable-next-line:import-name
import game_pb from 'game-protobuf/ts/game/game_pb.js';
// tslint:disable-next-line:import-name
import game_pb_service from 'game-protobuf/ts/game/game_pb_service.js';

export type GoogleMessage = Message;

export type BaseReq = gamebase_pb.BaseReq;
export const BaseReq = gamebase_pb.BaseReq;
export type Result = utilities_base_pb.Result;
export const Result = utilities_base_pb.Result;
export type Empty = utilities_base_pb.Empty;
export const Empty = utilities_base_pb.Empty;
export type AuthRes = user_pb.AuthRes;
export const AuthRes = user_pb.AuthRes;
export type LinkReq = user_pb.LinkReq;
export const LinkReq = user_pb.LinkReq;
export type LinkRes = user_pb.LinkRes;
export const LinkRes = user_pb.LinkRes;
export type PlatformReq = user_pb.PlatformReq;
export const PlatformReq = user_pb.PlatformReq;
export type PlatformRes = user_pb.PlatformRes;
export const PlatformRes = user_pb.PlatformRes;
export type UpdateBalanceReq = user_pb.UpdateBalanceReq;
export const UpdateBalanceReq = user_pb.UpdateBalanceReq;
export type UpdateBalanceRes = user_pb.UpdateBalanceRes;
export const UpdateBalanceRes = user_pb.UpdateBalanceRes;
export type UserInfoReq = user_pb.UserInfoReq;
export const UserInfoReq = user_pb.UserInfoReq;
export type UserInfoRes = user_pb.UserInfoRes;
export const UserInfoRes = user_pb.UserInfoRes;
export type AuthReq = user_pb.AuthReq;
export const AuthReq = user_pb.AuthReq;
export type DisconnectReq = game_pb.DisconnectReq;
export const DisconnectReq = game_pb.DisconnectReq;
export type DisconnectRes = game_pb.DisconnectRes;
export const DisconnectRes = game_pb.DisconnectRes;
export type HeartbeatReq = game_pb.HeartbeatReq;
export const HeartbeatReq = game_pb.HeartbeatReq;
export type HeartbeatRes = game_pb.HeartbeatRes;
export const HeartbeatRes = game_pb.HeartbeatRes;
export type KickRes = game_pb.KickRes;
export const KickRes = game_pb.KickRes;
export type MarqueeRes = game_pb.MarqueeRes;
export const MarqueeRes = game_pb.MarqueeRes;
export type PacketReq = game_pb.PacketReq;
export const PacketReq = game_pb.PacketReq;
export type PacketRes = game_pb.PacketRes;
export const PacketRes = game_pb.PacketRes;
export type PacketType = game_pb.PacketType;
export const PacketType = game_pb.PacketType;
export type ResumeReq = game_pb.ResumeReq;
export const ResumeReq = game_pb.ResumeReq;
export type ResumeRes = game_pb.ResumeRes;
export const ResumeRes = game_pb.ResumeRes;
export type Any = any_pb.Any;
export const Any = any_pb.Any;
export const Game = game_pb_service.Game;
export type MsgCode = utilities_base_pb.MsgCode;
export const MsgCode = utilities_base_pb.MsgCode;

// 技能卡（訊息、enum 與 packet balance 工具）
export * from './SkillCardProto';

export type BonusEvent = bonus_pb.BonusEvent;
export const BonusEvent = bonus_pb.BonusEvent;

export type BetBonusReq = bonus_pb.BetBonusReq;
export const BetBonusReq = bonus_pb.BetBonusReq;
export type BetBonusRes = bonus_pb.BetBonusRes;
export const BetBonusRes = bonus_pb.BetBonusRes;
export type BonusInfoReq = bonus_pb.BonusInfoReq;
export const BonusInfoReq = bonus_pb.BonusInfoReq;
export type BonusInfoRes = bonus_pb.BonusInfoRes;
export const BonusInfoRes = bonus_pb.BonusInfoRes;
export type BonusState = bonus_pb.BonusState;
export const BonusState = bonus_pb.BonusState;
export type CheckBonusReq = bonus_pb.CheckBonusReq;
export const CheckBonusReq = bonus_pb.CheckBonusReq;
export type CheckBonusRes = bonus_pb.CheckBonusRes;
export const CheckBonusRes = bonus_pb.CheckBonusRes;
export type EventInfo = bonus_pb.EventInfo;
export const EventInfo = bonus_pb.EventInfo;
