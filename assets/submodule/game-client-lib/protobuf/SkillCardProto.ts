// 技能卡協定型別與工具（不依賴 cc，node 可測）
// proto：game-protobuf proto/extension/skill_card.proto（v2.11.7+）
// tslint:disable-next-line:import-name
import skill_card_pb from 'game-protobuf/ts/extension/skill_card_pb.js';

export type SkillCardCheckReq = skill_card_pb.SkillCardCheckReq;
export const SkillCardCheckReq = skill_card_pb.SkillCardCheckReq;
export type SkillCardCheckRes = skill_card_pb.SkillCardCheckRes;
export const SkillCardCheckRes = skill_card_pb.SkillCardCheckRes;
export type SkillCardInfo = skill_card_pb.SkillCardInfo;
export const SkillCardInfo = skill_card_pb.SkillCardInfo;
export type SkillCardEventInfo = skill_card_pb.SkillCardEventInfo;
export const SkillCardEventInfo = skill_card_pb.SkillCardEventInfo;
export type SkillCardUseReq = skill_card_pb.SkillCardUseReq;
export const SkillCardUseReq = skill_card_pb.SkillCardUseReq;
export type SkillCardUseRes = skill_card_pb.SkillCardUseRes;
export const SkillCardUseRes = skill_card_pb.SkillCardUseRes;
export type SkillCardDrawReq = skill_card_pb.SkillCardDrawReq;
export const SkillCardDrawReq = skill_card_pb.SkillCardDrawReq;
export type SkillCardDrawRes = skill_card_pb.SkillCardDrawRes;
export const SkillCardDrawRes = skill_card_pb.SkillCardDrawRes;

/** Any type name（收發封包與 listener key 共用） */
export enum SkillCardKey {
    SkillCardCheckReq = 'extension.SkillCardCheckReq',
    SkillCardCheckRes = 'extension.SkillCardCheckRes',
    SkillCardUseReq = 'extension.SkillCardUseReq',
    SkillCardUseRes = 'extension.SkillCardUseRes',
    SkillCardDrawReq = 'extension.SkillCardDrawReq',
    SkillCardDrawRes = 'extension.SkillCardDrawRes',
}

/** SkillCardInfo.state（proto v2.11.10 起為具名 enum，直接 re-export） */
export type SkillCardState = skill_card_pb.SkillCardState;
export const SkillCardState = skill_card_pb.SkillCardState;

/** SkillCardInfo.bag_type：NONE=發卡即用（情境一）GAME=遊戲背包（情境二）VENDOR=廠商背包（情境三） */
export type SkillCardBagType = skill_card_pb.SkillCardBagType;
export const SkillCardBagType = skill_card_pb.SkillCardBagType;

/**
 * SkillCardInfo.card_type / SkillCardEventInfo.card_type（proto v2.11.12，語意見 v2.11.13 註解）：
 * FREE_SPIN=0 送局數（一般轉動，過程中仍可能自然觸發免費遊戲等特色）、
 * FREE_GAME=1 必定進入免費遊戲/紅利遊戲/免費重轉（活動 feature_buy 指定）。
 * 兩者差別是「可能觸發」與「必定進入」，不是「有沒有特色」。發卡時由活動快照。
 * 0 為實際類型非佔位：舊版服務未帶此欄位會讀成 FREE_SPIN。
 */
export type SkillCardType = skill_card_pb.SkillCardType;
export const SkillCardType = skill_card_pb.SkillCardType;

/**
 * SkillCardDrawRes 本體沒有餘額欄位，入帳後餘額只在 PacketRes.packet_info。
 * 收包時（MemberServiceBase EXTENSION 分支）以此工具附掛，讓下游取得權威餘額。
 */
const PACKET_BALANCE_KEY = '__skillCardPacketBalance';

export interface PacketBalance {
    balance: string;
}

export function attachPacketBalance(msg: object, balance: string) {
    (msg as any)[PACKET_BALANCE_KEY] = { balance } as PacketBalance;
}

export function getPacketBalance(msg: object): PacketBalance | null {
    return (msg as any)[PACKET_BALANCE_KEY] || null;
}
