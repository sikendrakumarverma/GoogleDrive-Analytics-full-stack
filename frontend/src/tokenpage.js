import './App.css';
import React, { useEffect } from 'react';
import { useParams } from 'react-router';
//import {  useNavigate } from 'react-router-dom';

function Tokenpage() {

    const { id } = useParams();

  useEffect(() => {
    if (id) {
      localStorage.setItem('token', id);
      //navigate('/'); // Navigate to the root route '/'
      document.location.href = '/'
    }
  }, [id]);

  return <>{id}</>;
}
export default Tokenpage;
