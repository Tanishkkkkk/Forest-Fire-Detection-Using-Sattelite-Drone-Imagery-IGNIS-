import { useState, useEffect } from 'react';

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

export function useClock() {
  const [time, setTime] = useState('00:00:00');
  const [date, setDate] = useState('');

  useEffect(() => {
    const tick = () => {
      const dateOpts = { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' };
      const timeOpts = { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
      
      const now = new Date();
      const istDateStr = new Intl.DateTimeFormat('en-GB', dateOpts).format(now).toUpperCase();
      const istTimeStr = new Intl.DateTimeFormat('en-GB', timeOpts).format(now);
      
      setDate(`${istDateStr} IST`);
      setTime(istTimeStr);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return { time, date };
}
