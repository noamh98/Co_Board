// מחסנית ניווט טהורה (domain, TS בלבד). אינווריאנט: בית תמיד בתחתית; תמיד יש דרך חזרה.
// מונע לולאה ישירה: אותו לוח פעמיים ברצף לא נדחף — PRD §4.4 / HANDOFF §4.

export interface NavStack {
  readonly stack: readonly string[]; // boardIds; האחרון = הנוכחי
}

export function createNavStack(homeBoardId: string): NavStack {
  return { stack: [homeBoardId] };
}

/** דוחף לוח חדש. מונע לולאה ישירה (אותו ID ברצף). */
export function navPush(s: NavStack, boardId: string): NavStack {
  if (s.stack[s.stack.length - 1] === boardId) return s;
  return { stack: [...s.stack, boardId] };
}

/** חוזר לוח אחד אחורה. אם כבר בבית — נשאר. */
export function navPop(s: NavStack): NavStack {
  if (s.stack.length <= 1) return s;
  return { stack: s.stack.slice(0, -1) };
}

/** קפיצה ישירה לבית — מנקה כל ההיסטוריה. */
export function navHome(homeBoardId: string): NavStack {
  return { stack: [homeBoardId] };
}

export function navCurrent(s: NavStack): string {
  return s.stack[s.stack.length - 1];
}

export function navCanGoBack(s: NavStack): boolean {
  return s.stack.length > 1;
}
