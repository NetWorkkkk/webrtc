export function MemberList({ members, callMembers, me }) {
  return (
    <div className="members">
      {members.map((member) => {
        const inCall = callMembers.includes(member);
        return (
          <div className="member" key={member}>
            <span>{member === me ? `${member} (you)` : member}</span>
            <span className="status">
              <span className={`status-dot ${inCall ? "in-call" : ""}`} />
              {inCall ? "In call" : "In room"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
