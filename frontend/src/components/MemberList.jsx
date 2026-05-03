function nameToColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 45%, 36%)`;
}

export function MemberList({ members, callMembers, me }) {
  const inCall  = members.filter((m) => callMembers.includes(m));
  const inRoom  = members.filter((m) => !callMembers.includes(m));

  return (
    <div className="member-list">
      {inCall.length > 0 && (
        <MemberGroup label={`In call · ${inCall.length}`} members={inCall} me={me} active />
      )}
      {inRoom.length > 0 && (
        <MemberGroup label={`In room · ${inRoom.length}`} members={inRoom} me={me} />
      )}
    </div>
  );
}

function MemberGroup({ label, members, me, active = false }) {
  return (
    <div className="member-group">
      <div className="member-group-label">{label}</div>
      {members.map((name) => (
        <div key={name} className={`member-row${active ? " member-row--active" : ""}`}>
          <div className="member-avatar" style={{ background: nameToColor(name) }}>
            {name.charAt(0).toUpperCase()}
          </div>
          <span className="member-name">
            {name === me ? `${name} (you)` : name}
          </span>
          {active && <span className="member-badge">● In call</span>}
        </div>
      ))}
    </div>
  );
}
