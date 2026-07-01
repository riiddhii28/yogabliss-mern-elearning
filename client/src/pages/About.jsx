import banner from "../assets/banner-2.jpg";

export default function About() {
  return (
    <div className="page">
      <h2 className="section-title">About YogaBliss</h2>
      <img
        src={banner}
        alt="Yoga practice"
        style={{ width: "100%", maxHeight: 340, objectFit: "cover", borderRadius: 12, marginBottom: 30 }}
      />
      <div style={{ maxWidth: 720, margin: "0 auto", color: "#444", lineHeight: 1.8, fontSize: 17 }}>
        <p>
          YogaBliss is an online yoga studio built to make mindful movement accessible to everyone,
          everywhere. Whether you are rolling out your mat for the first time or deepening a lifelong
          practice, our courses meet you where you are.
        </p>
        <br />
        <p>
          Each course is led by experienced instructors and delivered as on-demand video lessons, so
          you can practise at your own pace. Track your progress, build a routine, and find your calm
          — one breath at a time.
        </p>
      </div>
    </div>
  );
}
