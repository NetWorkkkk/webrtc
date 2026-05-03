import { MAX_PINS } from "../hooks/useVideoLayout";

export function MembersPanel({ myName, callMembers, roomMembers, pinnedPeers, togglePin, canPin, onClose }) {
  const outsideCall = roomMembers.filter((n) => !callMembers.includes(n));

  return (
    <div className="members-panel">
      <div className="members-panel-header">
        <span>People</span>
        <button className="members-panel-close" onClick={onClose}>✕</button>
      </div>

      <Section title={`In call · ${callMembers.length}`}>
        {callMembers.map((name) => {
          const isMe = name === myName;
          const isPinned = pinnedPeers.includes(name);
          const disabled = !canPin(name);
          return (
            <div key={name} className="panel-member">
              <span className="panel-member-name">
                {isMe ? `${name} (you)` : name}
              </span>
              <button
                className={`panel-pin-btn${isPinned ? " panel-pin-btn--active" : ""}${disabled ? " panel-pin-btn--disabled" : ""}`}
                onClick={() => !disabled && togglePin(name)}
                title={isPinned ? "Unpin" : disabled ? `Max ${MAX_PINS} pins reached` : "Pin to main view"}
              >
                {isPinned ? "Unpin" : "Pin"}
              </button>
            </div>
          );
        })}
      </Section>

      {outsideCall.length > 0 && (
        <Section title={`In room · ${outsideCall.length}`}>
          {outsideCall.map((name) => (
            <div key={name} className="panel-member panel-member--room">
              <span className="panel-member-name">{name === myName ? `${name} (you)` : name}</span>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="members-panel-section">
      <div className="members-panel-section-title">{title}</div>
      {children}
    </div>
  );
}
