'use client';

import { useEffect, useId, useRef, useState } from 'react';

const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxSourceBytes = 20 * 1024 * 1024;
const maxEncodedLength = 4 * Math.floor(350 * 1024 / 3);
const maxImageSide = 1280;
const jpegPrefix = 'data:image/jpeg;base64,';

async function preparePhoto(file) {
  if (!acceptedTypes.includes(file.type) || file.size > maxSourceBytes) {
    throw new Error('Unsupported image');
  }

  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Cannot prepare image');

    let scale = Math.min(1, maxImageSide / Math.max(bitmap.width, bitmap.height));
    for (const quality of [0.85, 0.76, 0.66, 0.58]) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const photo = canvas.toDataURL('image/jpeg', quality);
      if (photo.startsWith(jpegPrefix) && photo.length - jpegPrefix.length <= maxEncodedLength) {
        return photo;
      }
      scale *= 0.76;
    }
    throw new Error('Cannot fit image');
  } finally {
    bitmap.close();
  }
}

export function WorkPhoto({ src, alt = '', className = 'work-photo-display' }) {
  if (!src) return null;
  return <img className={className} src={src} alt={alt} loading="lazy" decoding="async"/>;
}

export function WorkPhotoField({
  t, value, onChange, disabled, label = t('workPhoto'), onPreparingChange
}) {
  const id = useId();
  const [preparing, setPreparing] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const pending = useRef(null);
  const preparingCallback = useRef(onPreparingChange);

  useEffect(() => {
    preparingCallback.current = onPreparingChange;
  }, [onPreparingChange]);

  useEffect(() => () => {
    if (pending.current) {
      pending.current = null;
      preparingCallback.current?.(false);
    }
  }, []);

  function finishPreparing() {
    pending.current = null;
    setPreparing(false);
    preparingCallback.current?.(false);
  }

  async function selectPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const selection = {};
    pending.current = selection;
    setInvalid(false);
    setPreparing(true);
    preparingCallback.current?.(true);

    try {
      const photo = await preparePhoto(file);
      if (pending.current === selection) onChange(photo);
    } catch {
      if (pending.current === selection) setInvalid(true);
    } finally {
      if (pending.current === selection) finishPreparing();
    }
  }

  function removePhoto() {
    finishPreparing();
    setInvalid(false);
    onChange('');
  }

  return <div className="work-photo-field">
    <label htmlFor={id}>{label}</label>
    <p className="work-photo-hint" id={id + '-hint'}>{t('photoHint')}</p>
    <WorkPhoto className="work-photo-preview" src={value} alt={label}/>
    <div className="work-photo-controls">
      <input id={id} type="file" accept={acceptedTypes.join(',')} disabled={disabled || preparing}
        onChange={selectPhoto} aria-describedby={id + '-hint' + (invalid ? ' ' + id + '-error' : '')}
        aria-invalid={invalid || undefined}/>
      {value && <button className="quiet" type="button" onClick={removePhoto} disabled={disabled}>{t('removePhoto')}</button>}
    </div>
    {preparing && <p className="work-photo-status" role="status">{t('photoPreparing')}</p>}
    {invalid && <p className="work-photo-error" id={id + '-error'} role="alert">{t('photoInvalid')}</p>}
  </div>;
}
