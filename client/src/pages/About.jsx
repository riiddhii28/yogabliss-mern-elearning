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
          YogaBliss is a free learning demo with short introductions to Hatha yoga, Vinyasa,
          and meditation. Each course has a small, focused curriculum you can explore at your own pace.
        </p>
        <br />
        <p>
          The demo courses contain written lessons and optional practice ideas, not instructor-led
          videos or professional training. Enroll for free, read the lessons, and track your completion
          in your account.
        </p>
      </div>
    </div>
  );
}
