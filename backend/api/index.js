export default (_req, res) => {
  res.status(200).json({ status: "ok", probe: "esm-handler-v3" });
};
