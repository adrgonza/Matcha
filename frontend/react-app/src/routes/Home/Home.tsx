// src/routes/Home/Home.tsx
import { Link } from 'react-router-dom';
import NavbarLogged from '../../components/NavbarLogged/NavbarLogged';
import './home.css';

function Home() {
  return (
    <>
      <NavbarLogged />
      <div className="content d-flex flex-column align-items-center justify-content-center">
        <h1 className="display-4 text-center mb-3">Home</h1>
      </div>
    </>
  );
}

export default Home;
