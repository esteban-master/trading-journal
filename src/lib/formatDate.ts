import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { TZDate } from "@date-fns/tz";

export const formatDate = ({
  size,
  date,
  timezone
}: {
  size: 'minutes' | 'xxs' | 'xxsminute' | 'xs' | 'xs2' | 'xs3' | 'sm' | 'md' | 'lg' | 'full' | 'month/year' | 'month' | 'year' | 'yearmonth';
  date: Date;
  timezone?: string
}) => {
  const patterns = {
    minutes: 'hh:mm:ss a',
    xxs: 'yyyy-MM-dd',
    xxsminute: "dd-MM-yyyy 'a las' hh:mm a",
    'month/year': 'yyyy-MM',
    yearmonth: 'yyyyMM',
    xs: 'MMM, yyyy',
    xs2: "MMMM, yyyy",
    xs3: "dd-MM-yyyy",
    sm: 'dd, MMMM yyyy',
    md: "eee dd 'de' MMM yyyy",
    lg: "EEEE dd 'de' MMMM yyyy, hh:mm a",
    full: "EEEE dd 'de' MMMM yyyy 'a las' hh:mm a",
    month: 'MMMM',
    year: 'yyyy',
  };

  const zonedDate = new TZDate(date, timezone ? timezone : 'America/Santiago')
  return format(zonedDate, patterns[size], {
    locale: es,
  });
};
