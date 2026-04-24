import {
  CANCEL_CUTOFF_OPTIONS,
  CHARGE_MODE_OPTIONS,
  SIGNUP_MODE_OPTIONS,
} from "../constants/activity";
import type {
  ActivityDraft,
  ActivitySignupMode,
  CreateActivityInput,
  OwnerOption,
  VenueWithCourts,
} from "../types/activity";

export type FormCourt = {
  venueCourtId: string;
  label: string;
  enabled: boolean;
  capacity: string;
};

export type CreateForm = {
  sourceActivityId: string;
  coverUrl: string;
  signupMode: ActivitySignupMode;
  title: string;
  chargeAmountYuan: string;
  chargeDesc: string;
  activityDate: string;
  startTime: string;
  endTime: string;
  totalCapacity: string;
  cancelCutoffMinutesBeforeStart: string;
  descriptionRichtext: string;
};

export type DescriptionBlock =
  | {
      id: string;
      type: "paragraph";
      text: string;
    }
  | {
      id: string;
      type: "image";
      src: string;
    };

function createDescriptionBlockId(): string {
  return `description-block-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeHtml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripTags(value: string): string {
  return value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
}

export function createParagraphBlock(text = ""): DescriptionBlock {
  return {
    id: createDescriptionBlockId(),
    type: "paragraph",
    text,
  };
}

export function createImageBlock(src: string): DescriptionBlock {
  return {
    id: createDescriptionBlockId(),
    type: "image",
    src,
  };
}

export function ensureDescriptionBlocks(blocks: DescriptionBlock[]): DescriptionBlock[] {
  return blocks.length > 0 ? blocks : [createParagraphBlock()];
}

export function parseDescriptionRichtext(value: string): DescriptionBlock[] {
  const source = value.trim();

  if (!source) {
    return [createParagraphBlock()];
  }

  const blocks: DescriptionBlock[] = [];
  const tokenPattern = /<p\b[^>]*>([\s\S]*?)<\/p>|<img\b[^>]*src=(["'])(.*?)\2[^>]*\/?>/gi;
  let lastIndex = 0;

  const pushPlainText = (segment: string): void => {
    const normalized = decodeHtml(stripTags(segment)).trim();

    if (normalized) {
      blocks.push(createParagraphBlock(normalized));
    }
  };

  source.replace(tokenPattern, (matched, paragraphContent: string, _quote: string, imageSrc: string, offset: number) => {
    if (offset > lastIndex) {
      pushPlainText(source.slice(lastIndex, offset));
    }

    if (typeof imageSrc === "string" && imageSrc.trim()) {
      blocks.push(createImageBlock(decodeHtml(imageSrc.trim())));
    } else if (typeof paragraphContent === "string") {
      const paragraphText = decodeHtml(stripTags(paragraphContent)).trim();

      if (paragraphText) {
        blocks.push(createParagraphBlock(paragraphText));
      }
    }

    lastIndex = offset + matched.length;

    return matched;
  });

  if (lastIndex < source.length) {
    pushPlainText(source.slice(lastIndex));
  }

  if (blocks.length > 0) {
    return blocks;
  }

  return [createParagraphBlock(decodeHtml(stripTags(source)))];
}

export function serializeDescriptionBlocks(blocks: DescriptionBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "image") {
        const src = block.src.trim();

        return src ? `<img src="${escapeHtml(src)}" />` : "";
      }

      const text = block.text.trim();

      return text ? `<p>${escapeHtml(text).replace(/\n/g, "<br/>")}</p>` : "";
    })
    .filter((item) => item.length > 0)
    .join("");
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTime(date: Date): string {
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");

  return `${hour}:${minute}`;
}

export function getDefaultCreateForm(): CreateForm {
  const activityDate = new Date();
  activityDate.setDate(activityDate.getDate() + 3);
  activityDate.setHours(19, 30, 0, 0);

  const endDate = new Date(activityDate.getTime());
  endDate.setHours(21, 30, 0, 0);

  return {
    sourceActivityId: "",
    coverUrl: "",
    signupMode: "USER_SELECT_COURT",
    title: "",
    chargeAmountYuan: "68",
    chargeDesc: "",
    activityDate: formatDate(activityDate),
    startTime: formatTime(activityDate),
    endTime: formatTime(endDate),
    totalCapacity: "36",
    cancelCutoffMinutesBeforeStart: `${CANCEL_CUTOFF_OPTIONS[1]?.value ?? 60}`,
    descriptionRichtext: "",
  };
}

export function getDefaultAvailableCourts(
  venues: VenueWithCourts[],
  selectedVenueIndex: number
): FormCourt[] {
  const venue = venues[selectedVenueIndex];

  if (!venue) {
    return [];
  }

  return venue.courts.map((court, index) => ({
    venueCourtId: court.id,
    label: court.courtName,
    enabled: index < Math.min(2, venue.courts.length),
    capacity: "4",
  }));
}

export function mapDraftToCreateState(
  draft: ActivityDraft,
  ownerOptions: OwnerOption[],
  venues: VenueWithCourts[]
): {
  createForm: CreateForm;
  selectedOwnerIndex: number;
  selectedSignupModeIndex: number;
  selectedChargeModeIndex: number;
  selectedVenueIndex: number;
  availableCourts: FormCourt[];
  missingCourtLabels: string[];
} {
  const selectedOwnerIndex = Math.max(
    ownerOptions.findIndex(
      (option) => option.ownerType === draft.ownerType && option.ownerId === draft.ownerId
    ),
    0
  );
  const selectedSignupModeIndex = Math.max(
    SIGNUP_MODE_OPTIONS.findIndex((item) => item.value === draft.signupMode),
    0
  );
  const selectedChargeModeIndex = Math.max(
    CHARGE_MODE_OPTIONS.findIndex((item) => item.value === draft.chargeMode),
    0
  );
  const selectedVenueIndex = Math.max(
    venues.findIndex((venueItem) => venueItem.venue.id === draft.venueId),
    0
  );
  const venue = venues[selectedVenueIndex];
  const availableCourts =
    venue?.courts.map((court) => {
      const existingCourt = draft.courts.find((item) => item.venueCourtId === court.id);

      return {
        venueCourtId: court.id,
        label: court.courtName,
        enabled: Boolean(existingCourt),
        capacity: `${existingCourt?.capacity ?? 4}`,
      };
    }) ?? [];
  const missingCourtLabels =
    draft.signupMode === "USER_SELECT_COURT"
      ? draft.courts
          .filter((item) => !venue?.courts.some((court) => court.id === item.venueCourtId))
          .map((item) => item.label ?? "已停用场地")
      : [];

  return {
    createForm: {
      sourceActivityId: draft.sourceActivityId ?? "",
      coverUrl: draft.coverUrl ?? "",
      signupMode: draft.signupMode,
      title: draft.title,
      chargeAmountYuan:
        draft.chargeMode === "FREE" ? "0" : `${Math.round(draft.chargeAmountCents / 100)}`,
      chargeDesc: draft.chargeDesc,
      activityDate: draft.activityDate,
      startTime: draft.startTime,
      endTime: draft.endTime,
      totalCapacity: `${draft.totalCapacity ?? 36}`,
      cancelCutoffMinutesBeforeStart: `${draft.cancelCutoffMinutesBeforeStart}`,
      descriptionRichtext: draft.descriptionRichtext,
    },
    selectedOwnerIndex,
    selectedSignupModeIndex,
    selectedChargeModeIndex,
    selectedVenueIndex,
    availableCourts,
    missingCourtLabels,
  };
}

export function buildCreateActivityInput(params: {
  createForm: CreateForm;
  availableCourts: FormCourt[];
  ownerOption: OwnerOption | undefined;
  selectedVenue: VenueWithCourts | undefined;
  selectedChargeModeIndex: number;
  currentUserId: string;
}): CreateActivityInput {
  const {
    createForm,
    availableCourts,
    ownerOption,
    selectedVenue,
    selectedChargeModeIndex,
    currentUserId,
  } = params;

  if (!ownerOption) {
    throw new Error("请选择发布身份");
  }

  if (!selectedVenue) {
    throw new Error("请选择场馆");
  }

  if (!createForm.title.trim()) {
    throw new Error("请填写活动名称");
  }

  const signupMode = createForm.signupMode;
  const courts =
    signupMode === "USER_SELECT_COURT"
      ? availableCourts
          .filter((court) => court.enabled)
          .map((court, index) => {
            const capacity = Number(court.capacity || "0");

            if (!Number.isFinite(capacity) || capacity < 1) {
              throw new Error(`${court.label} 的人数上限至少为 1`);
            }

            return {
              venueCourtId: court.venueCourtId,
              capacity,
              sortOrder: index + 1,
            };
          })
      : [];

  if (signupMode === "USER_SELECT_COURT" && courts.length === 0) {
    throw new Error("请至少启用一片场地");
  }

  const totalCapacity =
    signupMode === "GENERAL" ? Number(createForm.totalCapacity || "0") : undefined;

  if (
    signupMode === "GENERAL" &&
    (!Number.isFinite(totalCapacity) || Number(totalCapacity) < 1)
  ) {
    throw new Error("活动总人数至少为 1");
  }

  const chargeMode = CHARGE_MODE_OPTIONS[selectedChargeModeIndex]?.value ?? "FIXED";
  const chargeAmount = Number(createForm.chargeAmountYuan || "0");

  if (chargeMode !== "FREE" && (!Number.isFinite(chargeAmount) || chargeAmount < 0)) {
    throw new Error("收费金额格式不正确");
  }

  const cancelCutoffMinutesBeforeStart = Number(
    createForm.cancelCutoffMinutesBeforeStart || `${CANCEL_CUTOFF_OPTIONS[1]?.value ?? 60}`
  );

  if (
    !Number.isFinite(cancelCutoffMinutesBeforeStart) ||
    cancelCutoffMinutesBeforeStart < 0
  ) {
    throw new Error("取消截止规则格式不正确");
  }

  return {
    ownerType: ownerOption.ownerType,
    ownerId: ownerOption.ownerId,
    createdBy: currentUserId,
    coverUrl: createForm.coverUrl.trim(),
    title: createForm.title,
    chargeMode,
    chargeAmountCents: chargeMode === "FREE" ? 0 : chargeAmount * 100,
    chargeDesc: createForm.chargeDesc,
    venueId: selectedVenue.venue.id,
    signupMode,
    activityDate: createForm.activityDate,
    startTime: createForm.startTime,
    endTime: createForm.endTime,
    cancelCutoffMinutesBeforeStart,
    descriptionRichtext: createForm.descriptionRichtext,
    totalCapacity,
    courts,
  };
}
