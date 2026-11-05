import { useState } from 'react';

export interface CaptchaRequest {
  img: string;
  sid: string;
}

interface Props {
  request: CaptchaRequest;
  onSubmit: (code: string) => void;
  onCancel: () => void;
}

export function CaptchaModal({ request, onSubmit, onCancel }: Props) {
  const [code, setCode] = useState('');
  return (
    <div className="ovk-modal-backdrop">
      <div className="ovk-modal">
        <div className="ovk-modal__title">Введите код с картинки</div>
        {request.img ? (
          <img className="ovk-captcha__img" src={request.img} alt="Капча" />
        ) : (
          <div className="ovk-empty">Капча недоступна</div>
        )}
        <input
          className="ovk-login__field"
          placeholder="Код"
          value={code}
          autoCapitalize="off"
          autoCorrect="off"
          onChange={(e: any) => setCode(e.target.value)}
          onKeyDown={(e: any) => {
            if (e.key === 'Enter' && code.trim()) onSubmit(code.trim());
          }}
        />
        <div className="ovk-modal__actions">
          <button className="ovk-btn-secondary" onClick={onCancel}>
            Отмена
          </button>
          <button className="ovk-btn-primary" disabled={!code.trim()} onClick={() => onSubmit(code.trim())}>
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
}
