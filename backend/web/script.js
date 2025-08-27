async function Deep(startTimestamp, endTimestamp) {
  try {
    const url = `http://127.0.0.1:8080/api/cdrs?startDate=${startTimestamp}&endDate=${endTimestamp}`;
    const resp = await fetch(url, { method: "GET" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    console.log("CDRs length:", Array.isArray(data) ? data.length : data);
  } catch (e) {
    console.error("Error fetching CDRs:", e.message);
  }
}
