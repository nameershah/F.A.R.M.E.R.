export default (_req, res) => {
  res.status(200).json({ status: "ok", probe: "minimal-handler-v2" });
};
