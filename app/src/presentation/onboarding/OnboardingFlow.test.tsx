import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingFlow } from './OnboardingFlow';

describe('OnboardingFlow — הדרכת פתיחה (C-05/C-10)', () => {
  it('דילוג בשלב הראשון קורא ל-onComplete מיד (persona=null)', () => {
    const onComplete = vi.fn();
    render(
      <OnboardingFlow hasCaregiverPin onComplete={onComplete} onOpenPinSettings={() => {}} />,
    );
    fireEvent.click(screen.getByTestId('onboarding-skip'));
    expect(onComplete).toHaveBeenCalledWith(null);
  });

  it('בחירת פרסונה → סיור 3 מסכים → סיום מעביר את הפרסונה (עם קוד הורה, ללא שלב קוד)', () => {
    const onComplete = vi.fn();
    render(
      <OnboardingFlow hasCaregiverPin onComplete={onComplete} onOpenPinSettings={() => {}} />,
    );
    fireEvent.click(screen.getByTestId('onboarding-persona-therapist'));
    fireEvent.click(screen.getByTestId('onboarding-next')); // 1→2
    fireEvent.click(screen.getByTestId('onboarding-next')); // 2→3
    fireEvent.click(screen.getByTestId('onboarding-next')); // 3 (אחרון) → סיום
    expect(onComplete).toHaveBeenCalledWith('therapist');
    // אין שלב תזכורת קוד כשקיים קוד הורה.
    expect(screen.queryByTestId('onboarding-pin-set')).toBeNull();
  });

  it('ללא קוד הורה — מוצג שלב תזכורת קוד; "הגדרת קוד" פותחת הגדרות ומסיימת', () => {
    const onComplete = vi.fn();
    const onOpenPinSettings = vi.fn();
    render(
      <OnboardingFlow
        hasCaregiverPin={false}
        onComplete={onComplete}
        onOpenPinSettings={onOpenPinSettings}
      />,
    );
    fireEvent.click(screen.getByTestId('onboarding-persona-family'));
    fireEvent.click(screen.getByTestId('onboarding-next')); // 1→2
    fireEvent.click(screen.getByTestId('onboarding-next')); // 2→3
    fireEvent.click(screen.getByTestId('onboarding-next')); // 3→4 (תזכורת קוד)
    expect(screen.getByTestId('onboarding-pin-set')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('onboarding-pin-set'));
    expect(onOpenPinSettings).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('family');
  });

  it('Escape מדלג על ההדרכה', () => {
    const onComplete = vi.fn();
    render(
      <OnboardingFlow hasCaregiverPin onComplete={onComplete} onOpenPinSettings={() => {}} />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onComplete).toHaveBeenCalledWith(null);
  });
});
