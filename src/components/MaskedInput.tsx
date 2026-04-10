'use client';

import { useEffect, useRef } from 'react';
import IMask from 'imask';

type MaskedInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  mask: string;
};

export function MaskedInput({ mask, ...props }: MaskedInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!inputRef.current) {
      return;
    }

    const masked = IMask(inputRef.current, { mask });

    return () => {
      masked.destroy();
    };
  }, [mask]);

  return <input ref={inputRef} {...props} />;
}
