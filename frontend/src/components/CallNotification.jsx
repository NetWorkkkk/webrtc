import { useAppState } from "../state/appContext";

export function CallNotification() {
  const { callNotification, joinCall, dismissCallNotification } = useAppState();

  if (!callNotification) return null;

  const { callerName } = callNotification;

  function handleJoin() {
    dismissCallNotification();
    joinCall();
  }

  return (
    <div className="call-notif-backdrop">
      <div className="call-notif" role="alertdialog" aria-modal="true">
        <div className="call-notif-icon">📞</div>
        <div className="call-notif-body">
          <p className="call-notif-title">
            <strong>{callerName}</strong> started a call
          </p>
          <p className="call-notif-sub">Do you want to join?</p>
        </div>
        <div className="call-notif-actions">
          <button className="call-notif-btn call-notif-btn--join" onClick={handleJoin}>
            Join
          </button>
          <button className="call-notif-btn call-notif-btn--dismiss" onClick={dismissCallNotification}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
