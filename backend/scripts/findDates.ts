import { RepositoryFactory } from '../src/repositories/RepositoryFactory';

(async () => {
  try {
    const repo = RepositoryFactory.getRepository();
    const cases = await (repo as any).fetchAll('casemasters');
    let minDate = new Date();
    let maxDate = new Date(0);
    
    cases.forEach((c: any) => {
      let dt;
      if (c.IncidentFromDate) {
          const dStr = String(c.IncidentFromDate);
          const match = dStr.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})\s+(AM|PM)$/i);
          if (match) {
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1;
            const year = parseInt(match[3], 10);
            let hour = parseInt(match[4], 10);
            const min = parseInt(match[5], 10);
            const ampm = match[6].toUpperCase();
            if (ampm === 'PM' && hour < 12) hour += 12;
            if (ampm === 'AM' && hour === 12) hour = 0;
            dt = new Date(year, month, day, hour, min);
          } else {
            dt = new Date(c.IncidentFromDate);
          }
      } else if (c.CrimeRegisteredDate) {
        dt = new Date(c.CrimeRegisteredDate);
      }
      
      if (dt && !isNaN(dt.getTime())) {
        if (dt < minDate) minDate = dt;
        if (dt > maxDate) maxDate = dt;
      }
    });

    console.log(`Min Date: ${minDate.toISOString()}`);
    console.log(`Max Date: ${maxDate.toISOString()}`);
  } catch (error) {
    console.error(error);
  }
})();
