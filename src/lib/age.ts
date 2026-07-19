// 생일 -> "태어난 지 N일 / N개월" 또는 "N살" 같은 친근한 한국어 나이.
// 생일이 없으면 null (라벨을 안 보여준다).
export function koreanAge(birthdate: string | null, now: Date = new Date()): string | null {
  if (!birthdate) {
    return null;
  }

  const born = new Date(birthdate);
  if (Number.isNaN(born.getTime())) {
    return null;
  }

  const days = Math.floor((now.getTime() - born.getTime()) / 86_400_000);
  if (days < 0) {
    return null;
  }
  if (days < 30) {
    return `태어난 지 ${days}일`;
  }

  let months = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth());
  if (now.getDate() < born.getDate()) {
    months -= 1;
  }
  if (months < 24) {
    return `태어난 지 ${months}개월`;
  }

  return `${Math.floor(months / 12)}살`;
}
