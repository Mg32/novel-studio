export const STORAGE_KEY = "novel-studio-script-v1";

export const COMMAND_OPTIONS = [
  "speaker",
  "text",
  "bg",
  "jump",
  "chara_new",
  "chara_show",
  "chara_hide",
  "r",
];

export const EDITOR_FONT =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

export const BG_TEMPLATE_OPTIONS = [
  { label: "日常（室内） / リビング", path: "templates/backgrounds/living_room.svg" },
  { label: "日常（室内） / キッチン", path: "templates/backgrounds/kitchen.svg" },
  { label: "日常（室内） / 風呂場", path: "templates/backgrounds/bathroom.svg" },
  { label: "日常（室内） / 玄関", path: "templates/backgrounds/entrance.svg" },
  { label: "日常（室内） / マンションの廊下", path: "templates/backgrounds/apartment_hallway.svg" },
  { label: "日常（室内） / 一軒家の前", path: "templates/backgrounds/house_front.svg" },
  { label: "日常（室内） / 自室（昼）", path: "templates/backgrounds/room_day.svg" },
  { label: "日常（室内） / 自室（夜）", path: "templates/backgrounds/room_night.svg" },
  { label: "日常（屋外） / 公園", path: "templates/backgrounds/park.svg" },
  { label: "日常（屋外） / 橋", path: "templates/backgrounds/bridge.svg" },
  { label: "日常（屋外） / 路地裏", path: "templates/backgrounds/alley.svg" },
  { label: "日常（屋外） / コンビニ", path: "templates/backgrounds/convenience_store.svg" },
  { label: "日常（屋外） / 繁華街", path: "templates/backgrounds/night_city.svg" },
  { label: "日常（屋外） / 商店街", path: "templates/backgrounds/shopping_street.svg" },
  { label: "日常（屋外） / バス停", path: "templates/backgrounds/bus_stop.svg" },
  { label: "日常（屋外） / 川沿い", path: "templates/backgrounds/riverside.svg" },
  { label: "日常（屋外） / 海", path: "templates/backgrounds/sea.svg" },
  { label: "日常（屋外） / 雪景色", path: "templates/backgrounds/snow_landscape.svg" },
  { label: "日常（屋外） / 駅（外）", path: "templates/backgrounds/station_outside.svg" },
  { label: "日常（屋外） / 駅（プラットフォーム）", path: "templates/backgrounds/station_platform.svg" },
  { label: "日常（屋外） / カフェ", path: "templates/backgrounds/cafe.svg" },
  { label: "学園系 / 教室（昼）", path: "templates/backgrounds/classroom_day.svg" },
  { label: "学園系 / 教室（夕）", path: "templates/backgrounds/classroom_evening.svg" },
  { label: "学園系 / 廊下", path: "templates/backgrounds/school_hallway.svg" },
  { label: "学園系 / 階段", path: "templates/backgrounds/school_stairs.svg" },
  { label: "学園系 / 昇降口", path: "templates/backgrounds/shoe_locker.svg" },
  { label: "学園系 / 体育館", path: "templates/backgrounds/gymnasium.svg" },
  { label: "学園系 / 職員室", path: "templates/backgrounds/staff_room.svg" },
  { label: "学園系 / 保健室", path: "templates/backgrounds/infirmary.svg" },
  { label: "学園系 / 部室", path: "templates/backgrounds/club_room.svg" },
  { label: "学園系 / 通学路", path: "templates/backgrounds/school_route.svg" },
  { label: "学園系 / 建物の屋上", path: "templates/backgrounds/rooftop.svg" },
  { label: "会社系 / オフィス", path: "templates/backgrounds/office.svg" },
  { label: "会社系 / 会議室", path: "templates/backgrounds/meeting_room.svg" },
  { label: "会社系 / 病院の受付", path: "templates/backgrounds/hospital_reception.svg" },
  { label: "会社系 / 病室", path: "templates/backgrounds/hospital_room.svg" },
  { label: "会社系 / 取調室", path: "templates/backgrounds/interrogation_room.svg" },
  { label: "会社系 / 裁判所", path: "templates/backgrounds/courthouse.svg" },
  { label: "ファンタジー / 城", path: "templates/backgrounds/fantasy_castle.svg" },
  { label: "ファンタジー / 村", path: "templates/backgrounds/fantasy_village.svg" },
  { label: "ファンタジー / 洞窟", path: "templates/backgrounds/fantasy_cave.svg" },
  { label: "ファンタジー / 神殿", path: "templates/backgrounds/fantasy_temple.svg" },
  { label: "SF / 宇宙船", path: "templates/backgrounds/sf_spaceship.svg" },
  { label: "SF / 研究施設", path: "templates/backgrounds/sf_research_facility.svg" },
  { label: "SF / 未来都市", path: "templates/backgrounds/sf_future_city.svg" },
  { label: "ホラー / 廃墟", path: "templates/backgrounds/horror_ruins.svg" },
  { label: "ホラー / 暗い森", path: "templates/backgrounds/horror_dark_forest.svg" },
  { label: "ホラー / トンネル", path: "templates/backgrounds/horror_tunnel.svg" },
  { label: "ホラー / 古い屋敷", path: "templates/backgrounds/horror_old_mansion.svg" },
  { label: "ホラー / 監禁部屋", path: "templates/backgrounds/horror_captive_room.svg" },
  { label: "ホラー / 地下室", path: "templates/backgrounds/horror_basement.svg" },
];

export const CHARA_TEMPLATE_OPTIONS = [
  { label: "人物 / 主人公（男性・短髪）", path: "templates/characters/protagonist_male.svg" },
  { label: "人物 / 主人公（女性・ロング）", path: "templates/characters/protagonist_female.svg" },
  { label: "人物 / ヒロイン（ツインテール）", path: "templates/characters/heroine.svg" },
  { label: "人物 / 親友（ポニーテール）", path: "templates/characters/best_friend.svg" },
  { label: "人物 / ライバル（逆立ちヘア）", path: "templates/characters/rival.svg" },
  { label: "人物 / 大人キャラ（整った短髪）", path: "templates/characters/adult_teacher.svg" },
  { label: "人物 / 謎の人物（前髪長め）", path: "templates/characters/mysterious.svg" },
  { label: "人物 / モブA（坊主）", path: "templates/characters/mob_a.svg" },
  { label: "人物 / モブB（くせ毛）", path: "templates/characters/mob_b.svg" },
  { label: "人物 / モブC（片編み）", path: "templates/characters/mob_c.svg" },
  { label: "物語ポジション / 師匠", path: "templates/characters/master.svg" },
  { label: "物語ポジション / 弟子", path: "templates/characters/apprentice.svg" },
  { label: "物語ポジション / 黒幕", path: "templates/characters/mastermind.svg" },
  { label: "物語ポジション / 情報屋", path: "templates/characters/informant.svg" },
  { label: "物語ポジション / 被害者", path: "templates/characters/victim.svg" },
  { label: "物語ポジション / 容疑者", path: "templates/characters/suspect.svg" },
  { label: "年齢 / 幼児", path: "templates/characters/toddler.svg" },
  { label: "年齢 / 子ども", path: "templates/characters/child.svg" },
  { label: "年齢 / 青年", path: "templates/characters/young_adult.svg" },
  { label: "年齢 / 老人", path: "templates/characters/elderly.svg" },
  { label: "その他 / マスコットキャラ", path: "templates/characters/mascot.svg" },
  { label: "その他 / 宇宙人", path: "templates/characters/alien.svg" },
  { label: "その他 / 幽霊", path: "templates/characters/ghost.svg" },
  { label: "その他 / 動物", path: "templates/characters/animal.svg" },
];

export const DEFAULT_SCRIPT = `[label name=start]
[bg storage=/novel-studio/templates/backgrounds/club_room.svg]
[chara_new storage=/novel-studio/templates/characters/protagonist_female.svg name=チサキ]
[chara_show name=チサキ]
[label name=scene1]
#チサキ
今日はどうしたの？[p]
#ショーマ
いや、なんでもないよ[p]
#
[chara_hide name=チサキ]
[p]`;
