// src/components/estimate/ui/ChatBubble.tsx
import React from "react";
import clsx from "clsx";

type Sender = "bot" | "user";

interface Props {
  sender: Sender;
  children: React.ReactNode;
}

const ChatBubble: React.FC<Props> = ({ sender, children }) => {
  const isBot = sender === "bot";

  return (
    <div
      className={clsx("flex w-full gap-2", {
        "justify-start": isBot,
        "justify-end": !isBot,
      })}
    >
      <div
        className={clsx(
          "max-w-[90%] rounded-2xl px-3 py-2 text-sm md:text-[0.95rem]",
          {
            "bg-emerald-50 text-emerald-900": isBot,
            "bg-slate-800 text-white": !isBot,
          }
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default ChatBubble;

