import Header from "./components/Header";
import Hero from "./components/Hero";
import Categories from "./components/Categories";
import HowItWorks from "./components/HowItWorks";
import Brands from "./components/Brands";
import StoreLocation from "./components/StoreLocation";
import Footer from "./components/Footer";
import ChatBot from "./components/ChatBot";
import ScrollProgressBar from "./components/ScrollProgressBar";

export default function App() {
  return (
    <div className="min-h-screen bg-[#0A0A15] font-body text-graphite">
      <ScrollProgressBar />
      <Header />
      <Hero />
      <Categories />
      <HowItWorks />
      <Brands />
      <StoreLocation />
      <Footer />
      <ChatBot />
    </div>
  );
}
