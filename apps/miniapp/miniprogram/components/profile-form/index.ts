export {};

import { compressAndUploadImageAsset } from "../../services/asset-service";

type ProfileFormValue = {
  avatarInitial: string;
  avatarUrl: string;
  nickname: string;
  selectedGenderIndex: number;
  phoneNumber: string;
  phoneComplete: boolean;
};

type FormInputEvent = {
  detail: {
    value?: string;
  };
};

type ChooseAvatarEvent = {
  detail: {
    avatarUrl?: string;
  };
};

type ProfileFormData = {
  form: ProfileFormValue;
  showBaseFields: boolean;
  showPhoneField: boolean;
  summaryText: string;
  uploadingAvatar: boolean;
};

type ProfileFormMethods = {
  syncForm(): void;
  emitChange(nextForm: ProfileFormValue): void;
  uploadAvatarFile(filePath: string): Promise<void>;
  handleChooseWechatAvatar(event: ChooseAvatarEvent): Promise<void>;
  handleNicknameInput(event: FormInputEvent): void;
  handleGenderChange(event: FormInputEvent): void;
  handlePhoneNumberInput(event: FormInputEvent): void;
};

type ProfileFormProperties = {
  compactWhenComplete: boolean;
  requireBase: boolean;
  requirePhone: boolean;
  value: Partial<ProfileFormValue>;
};

type ProfileFormComponent = WechatMiniprogram.ComponentInstance<ProfileFormData> &
  ProfileFormMethods & {
    properties: ProfileFormProperties;
    triggerEvent(name: string, detail: ProfileFormValue): void;
  };

function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

function isValidPhoneNumber(value: string): boolean {
  return /^1[3-9]\d{9}$/.test(value.trim());
}

function getAvatarInitial(nickname: string): string {
  return nickname.trim().slice(0, 1) || "你";
}

function getDefaultValue(): ProfileFormValue {
  return {
    avatarInitial: "你",
    avatarUrl: "",
    nickname: "",
    selectedGenderIndex: 0,
    phoneNumber: "",
    phoneComplete: false,
  };
}

function normalizeForm(value?: Partial<ProfileFormValue>): ProfileFormValue {
  const nickname = value?.nickname ?? "";
  const phoneNumber = normalizePhoneNumber(value?.phoneNumber ?? "");

  return {
    ...getDefaultValue(),
    ...value,
    avatarInitial: value?.avatarInitial || getAvatarInitial(nickname),
    nickname,
    phoneNumber,
    phoneComplete: isValidPhoneNumber(phoneNumber),
  };
}

const componentOptions: WechatMiniprogram.ComponentOption<ProfileFormData, ProfileFormMethods> & {
  observers: Record<string, (this: ProfileFormComponent) => void>;
} & ThisType<ProfileFormComponent> = {
  properties: {
    compactWhenComplete: {
      type: Boolean,
      value: false,
    },
    requireBase: {
      type: Boolean,
      value: true,
    },
    requirePhone: {
      type: Boolean,
      value: false,
    },
    value: {
      type: Object,
      value: getDefaultValue(),
    },
  },

  data: {
    form: getDefaultValue(),
    showBaseFields: true,
    showPhoneField: false,
    summaryText: "",
    uploadingAvatar: false,
  },

  lifetimes: {
    attached(): void {
      this.syncForm();
    },
  },

  observers: {
    "value, compactWhenComplete, requireBase, requirePhone": function syncProfileForm(
      this: ProfileFormComponent
    ): void {
      this.syncForm();
    },
  },

  methods: {
    syncForm(this: ProfileFormComponent): void {
      const form = normalizeForm(this.properties.value as Partial<ProfileFormValue>);
      const compactWhenComplete = Boolean(this.properties.compactWhenComplete);
    const requireBase = Boolean(this.properties.requireBase);
    const requirePhone = Boolean(this.properties.requirePhone);
      const baseComplete = Boolean(
        form.avatarUrl && form.nickname.trim() && form.selectedGenderIndex > 0
      );
      const phoneComplete = isValidPhoneNumber(form.phoneNumber);
      const showBaseFields = requireBase && (!compactWhenComplete || !baseComplete);
      const showPhoneField = requirePhone && (!compactWhenComplete || !phoneComplete);
      const summaryParts = [
        baseComplete ? form.nickname.trim() : "",
        phoneComplete ? form.phoneNumber : "",
      ].filter(Boolean);

      this.setData({
        form,
        showBaseFields,
        showPhoneField,
        summaryText: summaryParts.join(" · "),
      });
    },

    emitChange(this: ProfileFormComponent, nextForm: ProfileFormValue): void {
      this.setData({
        form: nextForm,
      });
      this.triggerEvent("change", nextForm);
    },

    async uploadAvatarFile(this: ProfileFormComponent, filePath: string): Promise<void> {
      if (this.data.uploadingAvatar) {
        return;
      }

      if (!filePath) {
        return;
      }

      this.setData({
        uploadingAvatar: true,
      });

      try {
        const uploaded = await compressAndUploadImageAsset(filePath, "user-avatar");

        this.emitChange({
          ...(this.data.form as ProfileFormValue),
          avatarUrl: uploaded.assetUrl,
        });
      } catch (error) {
        wx.showToast({
          title: error instanceof Error ? error.message : "头像上传失败，请稍后重试",
          icon: "none",
        });
      } finally {
        this.setData({
          uploadingAvatar: false,
        });
      }
    },

    async handleChooseWechatAvatar(
      this: ProfileFormComponent,
      event: ChooseAvatarEvent
    ): Promise<void> {
      const avatarUrl = typeof event.detail.avatarUrl === "string" ? event.detail.avatarUrl : "";

      await this.uploadAvatarFile(avatarUrl);
    },

    handleNicknameInput(this: ProfileFormComponent, event: FormInputEvent): void {
      const nickname = typeof event.detail.value === "string" ? event.detail.value.trim() : "";

      this.emitChange({
        ...(this.data.form as ProfileFormValue),
        avatarInitial: getAvatarInitial(nickname),
        nickname,
      });
    },

    handleGenderChange(this: ProfileFormComponent, event: FormInputEvent): void {
      this.emitChange({
        ...(this.data.form as ProfileFormValue),
        selectedGenderIndex: Math.max(Number(event.detail.value ?? 0), 0),
      });
    },

    handlePhoneNumberInput(this: ProfileFormComponent, event: FormInputEvent): void {
      const phoneNumber = normalizePhoneNumber(
        typeof event.detail.value === "string" ? event.detail.value : ""
      );

      this.emitChange({
        ...(this.data.form as ProfileFormValue),
        phoneNumber,
        phoneComplete: isValidPhoneNumber(phoneNumber),
      });
    },
  },
};

Component(componentOptions);
