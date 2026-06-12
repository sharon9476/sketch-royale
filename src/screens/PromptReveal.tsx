import { useStore } from '../store';

export default function PromptReveal() {
  const { room } = useStore();
  if (!room) return null;

  return (
    <div className="prompt-reveal">
      {!room.prompt ? (
        <>
          <div className="thinking-bot">🤖</div>
          <h2 className="reveal-prompt" style={{ fontSize: '1.8rem' }}>
            The AI is cooking up a prompt
            <span className="dots"><span>.</span><span>.</span><span>.</span></span>
          </h2>
        </>
      ) : (
        <>
          <span className="reveal-label">Round {room.round} of {room.settings.rounds} — everyone draws:</span>
          <h1 className="reveal-prompt">“{room.prompt}”</h1>
          <p className="tagline">Get your pen ready… ✏️</p>
        </>
      )}
    </div>
  );
}
