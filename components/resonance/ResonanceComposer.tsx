'use client';

import type { ChangeEvent, RefObject } from 'react';
import { Film, Globe2, ImagePlus, LoaderCircle, Lock, MapPin, Navigation, Plus, X } from 'lucide-react';

import type { ResonanceMediaType, ResonanceVisibility } from '@/lib/resonanceTypes';

type LocalMediaPreview = {
  key: string;
  name: string;
  url: string;
  mediaType: ResonanceMediaType;
};

type ResonanceComposerProps = {
  addressInput: string;
  titleInput: string;
  contentInput: string;
  visibilityInput: ResonanceVisibility;
  geoLabel?: string;
  locating: boolean;
  publishing: boolean;
  formError: string;
  maxAttachments: number;
  mediaPreviews: LocalMediaPreview[];
  addressInputRef: RefObject<HTMLInputElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onAddressChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onVisibilityChange: (value: ResonanceVisibility) => void;
  onLocate: () => void;
  onPublish: () => void;
  onFilePick: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (key: string) => void;
};

export function ResonanceComposer({
  addressInput,
  titleInput,
  contentInput,
  visibilityInput,
  geoLabel,
  locating,
  publishing,
  formError,
  maxAttachments,
  mediaPreviews,
  addressInputRef,
  fileInputRef,
  onAddressChange,
  onTitleChange,
  onContentChange,
  onVisibilityChange,
  onLocate,
  onPublish,
  onFilePick,
  onFileChange,
  onRemoveFile
}: ResonanceComposerProps) {
  return (
    <>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-blue-100/70">
        <MapPin className="h-3 w-3" />
        发布记忆坐标
      </div>

      <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-blue-100/80">
        <input
          ref={addressInputRef}
          value={addressInput}
          onChange={(event) => onAddressChange(event.target.value)}
          placeholder="输入精确到镇的地址"
          className="w-full bg-transparent text-xs text-blue-100/80 placeholder:text-blue-200/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={onLocate}
          className="flex cursor-pointer items-center gap-1 rounded-full border border-white/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-blue-100/80 transition hover:border-white/40"
          disabled={locating}
        >
          <Navigation className="h-3 w-3" />
          {locating ? '定位中' : '定位'}
        </button>
      </div>

      {geoLabel ? (
        <p className="text-xs text-blue-100/70">已定位：{geoLabel}（地图会按镇级坐标展示，保护具体住址）</p>
      ) : (
        <p className="text-xs text-blue-100/60">请先定位地址，地图将自动移动到对应镇域。</p>
      )}

      <input
        value={titleInput}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="记忆标题（可选）"
        className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-xs text-blue-100/80 placeholder:text-blue-200/50 focus:outline-none"
      />

      <textarea
        value={contentInput}
        onChange={(event) => onContentChange(event.target.value)}
        placeholder="写下想贴在地图上的那段记忆、气味、人物或经过……"
        rows={5}
        className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-xs text-blue-100/80 placeholder:text-blue-200/50 focus:outline-none"
      />

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onVisibilityChange('public')}
          className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
            visibilityInput === 'public'
              ? 'border-blue-300/60 bg-blue-400/10 text-white'
              : 'border-white/12 bg-white/5 text-blue-100/70 hover:border-white/25'
          }`}
        >
          <Globe2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="text-sm font-medium">公开贴文</p>
            <p className="mt-1 text-xs text-inherit/80">会出现在地图上，其他访客可查看、评论与收藏。</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onVisibilityChange('private')}
          className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
            visibilityInput === 'private'
              ? 'border-fuchsia-300/60 bg-fuchsia-400/10 text-white'
              : 'border-white/12 bg-white/5 text-blue-100/70 hover:border-white/25'
          }`}
        >
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="text-sm font-medium">仅自己可见</p>
            <p className="mt-1 text-xs text-inherit/80">不会公开显示在他人的地图上，但你仍可保留这条记忆。</p>
          </div>
        </button>
      </div>

      <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white">图片 / 视频附件</p>
            <p className="mt-1 text-xs text-blue-100/60">支持图片和视频，最多 {maxAttachments} 个文件。</p>
          </div>
          <button
            type="button"
            onClick={onFilePick}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs text-blue-50 transition hover:border-white/30"
          >
            <ImagePlus className="h-4 w-4" />
            添加附件
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={onFileChange}
        />

        {mediaPreviews.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {mediaPreviews.map((item) => (
              <div
                key={item.key}
                className="relative overflow-hidden rounded-2xl border border-white/12 bg-[#091128]"
              >
                {item.mediaType === 'video' ? (
                  <video src={item.url} className="h-36 w-full object-cover" muted playsInline />
                ) : (
                  <img src={item.url} alt={item.name} className="h-36 w-full object-cover" />
                )}

                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-[#030712] via-[#030712]/85 to-transparent px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-white">{item.name}</p>
                    <p className="mt-1 text-[11px] text-blue-100/65">
                      {item.mediaType === 'video' ? '视频附件' : '图片附件'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveFile(item.key)}
                    className="rounded-full border border-white/20 bg-black/20 p-1 text-blue-50 transition hover:border-white/40"
                    aria-label="移除附件"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-dashed border-white/10 px-4 py-4 text-xs text-blue-100/55">
            <Film className="h-4 w-4" />
            暂未添加附件；也可以只发布文字记忆。
          </div>
        )}
      </div>

      {formError ? <p className="text-xs text-red-200">{formError}</p> : null}

      <button
        type="button"
        onClick={onPublish}
        disabled={publishing}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-400 px-4 py-3 text-xs font-semibold text-white shadow-[0_16px_40px_rgba(59,130,246,0.35)] transition hover:scale-[1.01] disabled:opacity-60"
      >
        {publishing ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            发布中…
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            发布到地图
          </>
        )}
      </button>
    </>
  );
}
