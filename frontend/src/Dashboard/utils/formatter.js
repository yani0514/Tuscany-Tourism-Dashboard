export const fmtInt = (n) => (n ?? 0).toLocaleString();
export const fmtMonth = (m) => ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(m)-1] || m;
