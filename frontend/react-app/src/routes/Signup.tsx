import { useState } from "react";
import "../App.css";

function Signup() {
  const [errorTitle, setErrorTitle] = useState("");

  const handleSubmit = (event: any) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    const urlencoded = new URLSearchParams(formData as any);

    const requestOptions: RequestInit = {
      method: "POST",
      headers: myHeaders,
      body: urlencoded,
      redirect: "follow",
    };

    fetch("http://localhost:3000/api/signup", requestOptions)
      .then((response) => response.json())
      .then((result) => {
        if (result.status === "fail") {
          let errors = result.data?.errors;
          let invalid = "";
          if (errors) {
            invalid = errors
              .map((error: any) => {
                error.path;
              })
              .toString();
          }

          setErrorTitle(`${result.data.title} ${invalid}`);
          return;
        }
        if (result.status === "error") {
          setErrorTitle(result.data.title);
          return;
        }
        setErrorTitle("Success");
      })
      .catch((error) => {
        setErrorTitle("Some error");
        console.error(error);
      });
  };

  return (
    <>
      <h1>Signup</h1>
      <div>
        <form onSubmit={handleSubmit}>
          <p>{errorTitle}</p>
          <div>
            <label htmlFor="name">Name</label>
            <input type="text" id="name" name="name" required />
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" required />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" required />
          </div>
          <button type="submit">Register</button>
        </form>
      </div>
    </>
  );
}

export default Signup;
