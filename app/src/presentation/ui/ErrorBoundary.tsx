// presentation/ui/ErrorBoundary.tsx — גבול שגיאות (D2).
// שגיאת רינדור לא מפילה את כל האפליקציה למסך לבן (ילד נשאר בלי קול);
// במקום זאת מוצג מסך נפילה RTL עם כפתור טעינה-מחדש.

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // לוג לקונסול בלבד — ללא שליחת נתוני ילד החוצה (אינווריאנט פרטיות).
    console.error('[ErrorBoundary] render error:', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="error-boundary" dir="rtl" role="alert">
        <div className="error-boundary__card">
          <h1 className="error-boundary__title">משהו השתבש</h1>
          <p className="error-boundary__text">
            אירעה תקלה בלתי צפויה. אפשר לטעון מחדש את הלוח.
          </p>
          <button
            type="button"
            className="error-boundary__btn"
            onClick={this.handleReload}
          >
            טען מחדש
          </button>
        </div>
      </div>
    );
  }
}
