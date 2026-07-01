import "./Testimonials.css";

const testimonials = [
  {
    id: 1,
    name: "Lucas Bennett",
    position: "Yoga Enthusiast",
    message:
      "YogaBliss has transformed my practice. The classes are calming and the instructors are incredibly knowledgeable.",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces",
  },
  {
    id: 2,
    name: "Ethan Parker",
    position: "Certified Instructor",
    message:
      "The community at YogaBliss is so supportive. I've learned so much from both students and teachers here.",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces",
  },
  {
    id: 3,
    name: "Soo-Jin",
    position: "Yoga Enthusiast",
    message:
      "The online classes are perfect for my schedule. I love how I can practice from the comfort of my home.",
    image:
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&h=200&fit=crop&crop=faces",
  },
  {
    id: 4,
    name: "Ava Collins",
    position: "Yoga Practitioner",
    message:
      "YogaBliss offers a perfect blend of mindfulness and physicality. I highly recommend it to everyone!",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces",
  },
];

export default function Testimonials() {
  return (
    <section className="testimonials">
      <h2>Hear From Our YogaBliss Community</h2>
      <div className="testimonial-cards">
        {testimonials.map((t) => (
          <div className="testimonial-card" key={t.id}>
            <div className="student-image">
              <img src={t.image} alt={t.name} />
            </div>
            <p className="message">{t.message}</p>
            <p className="name">{t.name}</p>
            <p className="position">{t.position}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
