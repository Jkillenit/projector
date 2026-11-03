import { Component } from "react";

/** Keeps one broken view from blanking the whole window; resets when `resetKey` changes. */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;
    return (
      <div className="page">
        <div className="ui-card">
          <h2 className="t-heading">Something went wrong on this screen</h2>
          <p className="t-small t-muted">Your saved data is still here.</p>
          <div className="ui-chips">
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--md" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
            {this.props.onReset ? (
              <button
                type="button"
                className="ui-btn ui-btn--quiet ui-btn--md"
                onClick={() => {
                  this.setState({ error: null });
                  this.props.onReset();
                }}
              >
                Go to Home
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
}
