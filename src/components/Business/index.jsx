"use client";
import Image from "next/image";
import styles from "./business.module.css";
import { RevealWrapper } from "next-reveal";
import Link from "next/link";
import { BsTelephoneFill } from 'react-icons/bs';
import { FiUpload } from 'react-icons/fi';
import { BiLink } from 'react-icons/bi';
import { useState } from "react";
import 'react-toastify/dist/ReactToastify.css';
import BusinessApi from "@/lib/Businesses";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuth } from "firebase/auth";
// import { NotificationContainer, NotificationManager } from 'react-notifications';
import 'react-notifications/lib/notifications.css';
import { auth, db } from "./../../../firebase/firebase.js";
import { signInWithEmailAndPassword } from "firebase/auth";

import * as Yup from 'yup';
import { useRouter } from "next/router";
import { v4 as uuidv4 } from "uuid";
import { InfinitySpin } from 'react-loader-spinner'

import { storage } from '../../../firebase/firebase.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { createUserWithEmailAndPassword, FirebaseAuthException } from "firebase/auth"
import { useRef } from "react";


const Storage = getStorage(storage);




export default function Business() {

  const queryClient = useQueryClient();
  const router = useRouter();
  let id;
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    id = user.uid;
  } catch (error) {
    console.log("ERROR of USER ID", error)
  }

  const [errors, setErrors] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadFile, setUploadFile] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };


  // Create a reference to the hidden file input element
  const hiddenFileInput = useRef(null);
  const [text, setText] = useState(false)

  // Programatically click the hidden file input element
  // when the Button component is clicked
  const handleClick = (event) => {
    event.preventDefault()
    hiddenFileInput.current.click();
  };
  // Call a function (passed as a prop from the parent component)
  // to handle the user-selected file
  const handleChange = (event) => {
    event.preventDefault()

    const fileUploaded = event.target.files[0];
    setSelectedFile(fileUploaded);

    setFileName(fileUploaded.name);
    setText(true)
  };



  const validationSchema = Yup.object().shape({

    name: Yup.string().required(' Name is required'),
    businessName: Yup.string().required('Business Name is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    postCode: Yup.string()
      .required('Post Code is required')
      .test('valid-postcode', 'Invalid post code', value => {
        if (!value) return true; // Allow empty value

        // Check if value is a valid number and has a maximum length of 10 digits
        const numericValue = value.replace(/\D/g, ''); // Remove non-numeric characters
        return numericValue.length <= 10 && !isNaN(numericValue);
      }),
    contactNumber: Yup.string()
      .required('Contact Number is required')
      .test('valid-contactNumber', 'Invalid contactNumber number', value => {
        if (!value) return true; // Allow empty value
        return !isNaN(value);
      })
      .max(12, 'contactNumber  should not be more than 12 digits'),
    city: Yup.string()
      .required('City is required')
      .test('not-number', 'City cannot be a number', value => {
        // Check if the value is not a number
        return isNaN(value);
      }), province: Yup.string().required('Please select a province'),
    category: Yup.string().required('Please select a category'),
    businessType: Yup.string().required('Please select a businessType'),
    businessAddress: Yup.string().required('Please select a businessAddress'),
    numberEmployees: Yup.string()
      .required('Number of Employees is required')
      .test('valid-numberEmployees', 'Invalid number', value => {
        if (!value) return true; // Allow empty value
        return !isNaN(value);
      })
      .max(10000, 'Employees  should not be more than 10000 digits'),
    businessContact: Yup.string()
      .required('business Contact is required')
      .test('valid-businessContact', 'Invalid businessContact number', value => {
        if (!value) return true; // Allow empty value
        return !isNaN(value);
      })
      .max(12, 'business Contact number should not be more than 12 digits'),
    websiteLink: Yup.string().url('Invalid website URL'),
    password: Yup.string()
      .required('Password is required')
      .min(6, 'Password should be at least 6 characters'),


  });

  const [formData, setFormData] = useState({
    // id: id,
    name: "", businessName: "", email: "", businessType: "", numberEmployees: "", businessAddress: "", postCode: "", city: "", contactNumber: "", businessContact: "", province: "", websiteLink: "", category: "", role: "", password: ""
  });
  const [isInvalid, setIsInvalid] = useState(false);


  const updateField = (fieldName, newValue) => {
    setFormData(prevFormData => ({
      ...prevFormData,
      [fieldName]: newValue
    }));
  };



  const addMutation = useMutation(
    ["Businesses"],
    async (data) => {
      return await BusinessApi.addBusiness(data, id);
    },
    {
      onError: (data) => { console.log("ERROR MESSAGE", data.message) },
      onSuccess: (data) => {
        console.log("STATUS", data.message);
        if (data.message === "Business already exist!") {
          // NotificationManager.error("Email already exist!");


        }
        else {
          // NotificationManager.success("Your Business has been added successfully");
          router.push("/all-set")

          queryClient.invalidateQueries(["Businesses"]);
        }

      },
    }
  );



  const createNotification = (type, message) => {
    return () => {
      switch (type) {
        case 'info':
          // NotificationManager.info(message);
          break;
        case 'success':
          // NotificationManager.success(message);
          break;
        case 'warning':
          // NotificationManager.warning(message);
          break;
        case 'error':
          // NotificationManager.error("Email already used");
          break;
      }
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true)

    try {

      await validationSchema.validate(formData, { abortEarly: false });
      console.log('Form data is valid:', formData);



      // Checking if file input is filled or not
      if (selectedFile !== null) {
        const storageRef = ref(Storage, `${uuidv4()}_${selectedFile.name}`);

        try {
          // Upload the file
          await uploadBytes(storageRef, selectedFile);

          try {
            // Get the download URL
            const fileUrl = await getDownloadURL(storageRef);

            // Set the URL in state
            setUploadFile(fileUrl);
            console.log('Uploaded file URL:', fileUrl);

            // Set the file name
            setFileName(selectedFile.name);



            // Update formData with the file URL

            const updatedFormData = { ...formData, file: fileUrl, role: formData.category, status: "Pending" };

            console.log('data with file:', updatedFormData);

            setErrors("");

            // creating user with email and password
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;
            const salonId = user.uid
            console.log("SALON ID", user.uid)
            await signInWithEmailAndPassword(auth, formData.email, formData.password);

            // deleting password from object
            // delete updatedFormData.password;

            // Trigger mutation with updated formData
            console.log("UPLOADED DATA", updatedFormData);
            addMutation.mutate(updatedFormData, salonId);

          } catch (urlError) {
            console.error('Error getting download URL:', urlError);
            if (urlError === "FirebaseError: Firebase: Error (auth/email-already-in-use).") {
              // NotificationManager.error("Email already used!");
              alert("Email already used!")

            }

          }
          setLoading(false)

        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          // NotificationManager.error(uploadError);
          setLoading(false)

        }
        setLoading(false)

      }
      else {
        // deleting password from object
        // delete formData.password;






        // Update formData with the file URL

        const updatedFormData = { ...formData, role: formData.category, status: "Pending" };
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;
        console.log("SALON ID", user.uid)
        const salonId = user.uid

        await signInWithEmailAndPassword(auth, formData.email, formData.password);

        setErrors("")
        addMutation.mutate(updatedFormData, salonId)
        setLoading(false)

      }

      console.log("UPLOADING>>>", uploadFile)
      setLoading(false)


    } catch (error) {
      console.log(error);

      if (error instanceof Yup.ValidationError) {
        const newErrors = {};
        error.inner.forEach((err) => {
          newErrors[err.path] = err.message;
        });
        setErrors(newErrors);
        setLoading(false)
      }
      else {
        // createNotification('error', "Email already user!")
        // NotificationManager.error(error);
        if (error === "FirebaseError: Firebase: Error (auth/email-already-in-use).") {
          // NotificationManager.error("Email already used!");
          alert("Email already used!")

        }
        console.log("CATCH ERROR", error)
        setLoading(false)



      }

    }
  }

  const { data, isLoading, isError } = useQuery(
    ["categories"],
    async () => {
      try {
        const data = await BusinessApi.getCategories();
        return data;
      } catch (error) {
        console.log(error)
      }
    },

  );
  console.log("CATEGORY", data)

  return (
    <>
      <div>
        <div className="bg-[url(/images/haircut.png)] bg-center h-[90vh] md:h-[85vh] bg-cover bg-no-repeat md:bg-[url(/images/haircut.png)] lg:bg-[url(/images/haircut.png)]bg-cover  flex items-center justify-end">
          <div
            className={`${styles.discover} bg-white  flex flex-col items-center justify-center`}
          >
            <div className="mr-16  ml-16">
              <h2
                className="text-2xl font-bold mb-4"
                style={{
                  color: "#F26A5A",
                  fontSize: "30px",
                  fontWeight: "38px",
                  fontFamily: "'Quicksand', sans-serif",
                }}
              >
                GROW YOUR HAIR AND BEAUTY BUSINESS 44% IN A YEAR
              </h2>
              <div
                className="w-[83px] h-1 md:h-3 mb-6 mr-auto"
                style={{ backgroundColor: "#F26A5A" }}
              ></div>
              <div
                style={{
                  fontSize: "14px",
                  lineHeight: "17px",
                  fontFamily: "'Lato', sans-serif",
                }}
              >
                Partner with us online and we&apos;ll deliver you new customers,
                as well as giving you the digital tools to turn them into loyal,
                regular clients.
              </div>
              <Link href={"#destination-element-w-id"}>
                <button
                  className={`${styles?.formItems} btn-primary h-[48px] mt-6 rounded-[4px]`}
                  style={{
                    backgroundColor: "#F26A5A",
                    color: "white",
                    fontSize: "16px",
                    lineHeight: "12px",
                    fontWeight: "500",
                    fontFamily: "'Lato', sans-serif",
                  }}
                >
                  LIST YOUR BUSINESS
                </button>
              </Link>
            </div>
          </div>
        </div>



        <div className="w-full h-auto sm:h-[761px] bg-[#F26A5A] flex flex-col items-center justify-center">
          <p
            className={`${styles.introHead} mb-4 text-center`}
            style={{ color: "#FFFFFF" }}
          >
            {"advantages".toUpperCase()}
          </p>
          <div
            className="w-[83px] h-1 md:h-3 mb-6"
            style={{ backgroundColor: "#FFFFFF" }}
          ></div>
          <div className="flex flex-col sm:flex-row w-[95%] sm:w-[80%] lg:w-[60%] h-auto sm:h-[420px] mt-10 mb-10 sm:mt-0 sm:mb-0 bg-[#FFFFFF]">

            <div className="w-[92%] sm:w-[65%] m-[15px] sm:m-[40px] md:m-[70px]">
              <div className={styles.secondHeading}>
                The Things You&apos;ll Get
              </div>
              <RevealWrapper
                rotate={{ x: 0, y: -12, z: 0 }}
                origin="bottom"
                delay={200}
                duration={1000}
                distance="200px"
                reset={true}
                viewOffset={{ top: 0, right: 0, bottom: 0, left: 0 }}
              >
                <div className="text-justify" style={{ color: "#707070" }}>
                  Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do
                  eiusmod tempor incididunt ut ero labore et dolore magna aliqua. Ut
                  enim ad minim veniam, quis nostrud exercitation ullamco poriti
                  laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure
                  dolor in reprehenderit in uienply voluptate velit esse cillum
                  dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat
                  norin proident, sunt in culpa qui officia deserunt mollit anim id
                  est laborum.
                </div>
              </RevealWrapper>
            </div>

            <div className="w-[100%] sm:w-[35%]   mb-10 sm:mb-0 h-auto sm:h-[420px]">
              <RevealWrapper
                rotate={{ x: 12, y: 0, z: 0 }}
                origin="bottom"
                delay={200}
                duration={1000}
                distance="200px"
                reset={true}
                viewOffset={{ top: 0, right: 1, bottom: 0, left: 0 }}
              >
                <div className="w-full h-[129px] mb-4 bg-[#F2F2F2] flex flex-col justify-center pl-10">
                  <div
                    style={{
                      fontSize: "18px",
                      lineHeight: "17px",
                      fontWeight: "700",
                      fontFamily: "'Lato', sans-serif",
                      color: "#F26A5A",
                    }}
                  >
                    Item 1
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      lineHeight: "17px",
                      fontWeight: "500",
                      fontFamily: "'Lato', sans-serif",
                      color: "#F26A5A",
                    }}
                  >
                    Description
                  </div>
                </div>
                <div className="w-full h-[129px] mb-4 bg-[#F2F2F2] flex flex-col justify-center pl-10">
                  <div
                    style={{
                      fontSize: "18px",
                      lineHeight: "17px",
                      fontWeight: "700",
                      fontFamily: "'Lato', sans-serif",
                      color: "#F26A5A",
                    }}
                  >
                    Item 1
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      lineHeight: "17px",
                      fontWeight: "500",
                      fontFamily: "'Lato', sans-serif",
                      color: "#F26A5A",
                    }}
                  >
                    Description
                  </div>
                </div>
                <div className="w-full h-[130px] bg-[#F2F2F2] flex flex-col justify-center pl-10">
                  <div
                    style={{
                      fontSize: "18px",
                      lineHeight: "17px",
                      fontWeight: "700",
                      fontFamily: "'Lato', sans-serif",
                      color: "#F26A5A",
                    }}
                  >
                    Item 1
                  </div>

                  <div
                    style={{
                      fontSize: "14px",
                      lineHeight: "17px",
                      fontWeight: "500",
                      fontFamily: "'Lato', sans-serif",
                      color: "#F26A5A",
                    }}
                  >
                    Description
                  </div>
                </div>
              </RevealWrapper>
            </div>
          </div>
        </div>
        {/* </RevealWrapper> */}



        <div className="max-w-[1200px] mx-auto w-full py-12 bg-[#FFFFFF] flex flex-col items-center justify-center">
          <p
            className={`${styles.introHead} mb-2 text-center`}
            style={{ color: "#F26A5A" }}
          >
            {"terms and conditions".toUpperCase()}
          </p>
          <div
            className="w-[83px] h-1 md:h-3 mb-6"
            style={{ backgroundColor: "#F26A5A" }}
          ></div>
          <div className="flex flex-col lg:flex-row space-y-8 justify-between items-start w-full px-10 mt-[40px]">
            <RevealWrapper
              className="flex flex-col lg:flex-row space-y-8 justify-between items-start w-full px-10 mt-[40px]"
              rotate={{ x: 0, y: -12, z: 0 }}
              origin="bottom"
              delay={200}
              duration={1000}
              distance="200px"
              reset={true}
              viewOffset={{ top: 0, right: 0, bottom: 0, left: 0 }}
            >
              <div className="h-auto lg:h-[480px] max-w-full lg:max-w-[360px] w-full mt-6  text-justify lg:mx-6">
                <div>
                  Lorem ipsum dolor sit amet, consectetur adipisifwcing elit, sed do
                  eiusmod tempor incididunt ut labore et dolore roipi magna aliqua.
                  Ut enim ad minim veeniam, quis nostruklad exercitation ullamco
                  laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure
                  dolor in reprehenderit
                </div>
                <div className="w-full">
                  <Image
                    src={"/images/face2.png"}
                    alt="img"
                    width={200}
                    height={200}
                    className=" w-full object-cover  mt-4 h-[263px]"
                  />
                </div>
              </div>
              <div className=" h-auto lg:h-[480px] max-w-full lg:max-w-[360px] w-full text-justify lg:mx-6">

                Culpa qui officia deserunt mollit anim id est laborum. Sed ut
                perspiciatis unde omnis iste natus error sit voluptartem
                accusantium doloremque sed quia consequuntur magni dolores eosep
                quiklop ratione voluptatem sequi nesciunt. Neque porro quisquam
                est, quepi dolorem ipsum quia dolor srit amet, consectetur
                adipisci velit, seid quia non numquam eiuris modi tempora incidunt
                ut labore et dolore magnam aliquam quaerat iope voluptatem. <br />{" "}
                Lorem ipsum dolor sit amet, consectetur adipisifwcing elit, sed do
                eiusmod tempor incididunt ut labore et dolore roipi magna aliqua.
                Ut enim ad minim veeniam, quis nostruklad exercitation ullamco
                laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure
                dolor in reprehenderit in tufpoy voluptate velit esse cillum
                dolore eu fugiat nulla parieratur. Excepteur sint occaecat
                cupidatat.

              </div>
              <div className="max-w-full lg:max-w-[360px] w-full h-auto lg:h-[480px] bg-[#F2F2F2] "></div>
            </RevealWrapper>
          </div>
        </div>


        <div id="destination-element-w-id" className="bg-[url('/images/form.png')] overflow-x-hidden h-full w-full bg-center ">
          <div className="backdrop-brightness-50 py-10 h-full w-full ">


            <p
              className={`${styles.introHead} mb-2 text-center`}
              style={{ color: "#FFFFFF" }}
            >
              {"enroll your business now".toUpperCase()}
            </p>
            <div
              className="w-[83px] h-1 md:h-3 mb-6 mx-auto"
              style={{ backgroundColor: "#F26A5A" }}
            ></div>


            <div class="flex justify-center  mx-auto max-w-[1200px] px-4 items-center">

              <form onSubmit={(e) => { handleSubmit(e) }} class="w-full  px-4">

                <div class="grid grid-cols-1 md:grid-cols-[5fr_7fr] md:gap-4 md:mb-4">
                  <div class=" h-[50px] w-full mb-5">

                    <input
                      value={formData.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      type="text"
                      name="name"
                      id="name"
                      class="w-full h-full border border-gray-300 rounded px-4"
                      placeholder="Name"
                    />
                    {errors.name && <div className=" bg-[#F26A5A] px-1 justify-center  flex items-center max-w-[200px] whitespace-nowrap rounded-lg  text-[#ffffff] mb-1 mt-1  mt-0">{errors.name}</div>}

                  </div>
                  <div class="grid md:gap-4 grid-cols-1 md:grid-cols-[6fr_6fr]">
                    <div class=" h-[50px] w-full ">
                      <input
                        value={formData.businessName}
                        onChange={(e) => updateField("businessName", e.target.value)}
                        type="text"
                        name="businessName"
                        id="businessName"
                        class="w-full h-full border border-gray-300 rounded px-4"
                        placeholder="Business Name"
                      />
                      {errors.businessName && <div className=" bg-[#F26A5A] px-1 justify-center  flex items-center max-w-[200px] whitespace-nowrap rounded-lg  text-[#ffffff] mb-1 mt-1  mt-0">{errors.businessName}</div>}
                    </div>
                    <div class=" h-[50px] w-full ">
                      <input
                        class="w-full h-full border border-gray-300 rounded px-4"
                        type="password"
                        placeholder="Password"

                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={(e) => updateField("password", e.target.value)}
                      />
                      {errors.password && <div className="error mb-1 mt-1 ">{errors.password}</div>}
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-[5fr_7fr] md:gap-4 md:mb-4">

                  <div class=" h-[50px] w-full mb-4">


                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      class="w-full h-full border border-gray-300 rounded px-4"
                      placeholder="Email Address"
                    />
                    {errors.email && <div className=" bg-[#F26A5A] px-1 justify-center  flex items-center max-w-[200px] whitespace-nowrap rounded-lg  text-[#ffffff] mb-1 mt-1  mt-0">{errors.email}</div>}
                  </div>

                  <div className="grid md:gap-4 grid-cols-1 md:grid-cols-[6fr_6fr]">
                    <div class=" h-[50px] w-full mb-4">
                      <select
                        value={formData.businessType}
                        onChange={(e) => updateField("businessType", e.target.value)}
                        type="text"
                        class="w-full h-full text-[#707070] text-[14px] border border-gray-300 rounded px-4"
                        placeholder="Type of Business"

                      >
                        <option value={"Salon"}>Salon</option>
                        <option value={"SPA"}>SPA</option>
                        <option value={"Cutting"}>Cutting</option>
                      </select>
                      {errors.businessType && <div className=" bg-[#F26A5A] px-1 justify-center  flex items-center px-2 whitespace-nowrap rounded-lg  text-[#ffffff] mb-1 mt-1  mt-0">{errors.businessType}</div>}
                    </div>
                    <div class=" h-[50px] w-full mb-4">
                      <input
                        value={formData.numberEmployees}
                        onChange={(e) => updateField("numberEmployees", e.target.value)}
                        type="text"
                        class="w-full h-full border border-gray-300 rounded px-4"
                        placeholder="# of employee"
                      />
                      {errors.numberEmployees && <div className=" bg-[#F26A5A] px-1 justify-center  flex items-center  px-2 whitespace-nowrap rounded-lg  text-[#ffffff] mb-1 mt-1  mt-0">{errors.numberEmployees}</div>}
                    </div>
                  </div>

                </div>

                <div class="grid grid-cols-1 md:grid-cols-[5fr_7fr] md:gap-4 md:mb-4">
                  <div class=" h-[50px] w-full mb-4">
                    <input
                      value={formData.businessAddress}
                      onChange={(e) => updateField("businessAddress", e.target.value)}
                      type="text"
                      class="w-full h-full border border-gray-300 rounded px-4"
                      placeholder="Business Address"
                    />
                    {errors.businessAddress && <div className=" bg-[#F26A5A] px-1 justify-center  flex items-center px-2 w-[60%] whitespace-nowrap rounded-lg  text-[#ffffff] mb-1 mt-1  mt-0">{errors.businessAddress}</div>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[6fr_6fr] md:gap-4 ">

                    <div class=" h-[50px] w-full mb-4">
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        class="w-full h-full border border-gray-300 rounded px-4"
                        placeholder="City"

                      />
                      {errors.city && <div className=" bg-[#F26A5A] px-1 justify-center  flex items-center max-w-[200px] whitespace-nowrap rounded-lg  text-[#ffffff] mb-1 mt-1  mt-0">{errors.city}</div>}
                    </div>
                    <div class=" h-[50px] w-full mb-4">
                      <input
                        type="text"
                        value={formData.postCode}
                        onChange={(e) => updateField("postCode", e.target.value)}
                        class="w-full h-full border border-gray-300 rounded px-4"
                        placeholder="Postal Code"
                      />
                      {errors.postCode && <div className=" bg-[#F26A5A] px-1  max-w-[200px] whitespace-nowrap rounded-lg  text-[#ffffff] mb-1 mt-1  mt-0">{errors.postCode}</div>}
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-[5fr_7fr] md:gap-4 md:mb-4">
                  <div className="h-[50px] w-full">
                    <div class=" max-h-[50px] w-full  flex items-center justify-center w-full h-full bg-[#ffffff] px-4 border border-gray-300 rounded ">
                      <BsTelephoneFill color="#F26A5A" className="mr-2" />

                      <input
                        type="text"
                        value={formData.contactNumber}
                        onChange={(e) => updateField("contactNumber", e.target.value)}
                        class="w-full h-full "
                        placeholder="Contact Number"
                      />

                    </div>
                    {errors.contactNumber && <div className=" bg-[#F26A5A] px-1 justify-center  flex px-2 items-center max-w-[70%] whitespace-nowrap rounded-lg  text-[#ffffff] mb-1 mt-1  mt-0">{errors.contactNumber}</div>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[6fr_6fr] md:gap-4 ">
                    <div className="h-[50px] w-full ">
                      <div class="   flex items-center justify-center w-full h-full bg-[#ffffff] px-4 border border-gray-300 rounded ">
                        <BsTelephoneFill color="#F26A5A" className="mr-2" />

                        <input
                          type="text"
                          value={formData.businessContact}
                          onChange={(e) => updateField("businessContact", e.target.value)}
                          class="w-full h-full "
                          placeholder="Business Contact Number"
                        />

                      </div>
                      {errors.businessContact && <div className=" bg-[#F26A5A] mt-1 px-1   px-2 whitespace-nowrap rounded-lg  text-[#ffffff]    ">{errors.businessContact}</div>}
                    </div>

                    <div class=" h-[50px] w-full mb-4">
                      <input
                        value={formData.province}
                        onChange={(e) => updateField("province", e.target.value)}
                        type="text"
                        class="w-full h-full border border-gray-300 rounded px-4"
                        placeholder="Province"

                      />
                      {errors.province && <div className=" bg-[#F26A5A] px-1 justify-center  flex items-center max-w-[200px] whitespace-nowrap rounded-lg  text-[#ffffff] mb-1 mt-1  mt-0">{errors.province}</div>}
                    </div>

                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-[5fr_7fr] md:gap-4 md:mb-4">
                  <div className="h-[50px] w-full ">
                    <div class=" max-h-[50px] w-full flex items-center justify-center w-full h-full bg-[#ffffff] px-4 border border-gray-300 rounded ">
                      <BiLink size={25} color="#F26A5A" className="mr-1" />

                      <input
                        type="text"
                        value={formData.websiteLink}
                        onChange={(e) => updateField("websiteLink", e.target.value)}
                        class="w-full h-full "
                        placeholder="Website Link"
                      />


                    </div>

                    {errors.websiteLink && <div className=" bg-[#F26A5A] px-1 justify-center  flex items-center max-w-[200px] whitespace-nowrap rounded-lg  text-[#ffffff] mb-1 mt-1  mt-0">{errors.websiteLink}</div>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[6fr_6fr] md:gap-4 ">

                    <div class=" h-[50px] w-full mb-4">
                      <select
                        value={formData.category}
                        onChange={(e) => updateField("category", e.target.value)}
                        className="w-full h-full text-[#707070] text-[14px] outline-none border border-gray-300 rounded px-4"
                      >
                        {data?.map((item, index) => (
                          <option className="hover:bg-[#707070] outline-none border border-gray-300 rounded "
                            value={item?.name?.name}
                            key={index}
                          >
                            {item?.name?.name}
                          </option>
                        ))}

                      </select>

                      {errors.category && <div className=" bg-[#F26A5A] px-1 justify-center  flex items-center max-w-[200px] whitespace-nowrap rounded-lg  text-[#ffffff] mb-1 mt-1  mt-0">{errors.category}</div>}
                    </div>


                    <div class=" h-[50px]  border border-gray-300  rounded bg-white w-full mb-4 ">
                      <div className="flex justify-start  pl-5 items-center w-full h-full">
                        {/* <FileUploader handleFile={handleFile} /> */}
                        <>
                          <button className=" flex justify-start items-center" onClick={handleClick}>
                            <FiUpload size={30} color="#F26A5A" className="mr-4" /> {text ? null : <p className="opacity-50">Upload a file</p>}
                          </button>
                          <input
                            type="file"
                            onChange={handleChange}
                            ref={hiddenFileInput}
                            style={{ display: "none" }} // Make the file input element invisible
                          />
                        </>
                        {fileName ? <p>Uploaded file: {fileName}</p> : null}

                        {/* <input
                        onChange={handleFileChange}
                        name="uploadFile"
                        id="uploadFile"
                        type="file"
                        class="w-full   h-full px-4"
                        placeholder="File"


                      /> */}

                      </div>
                      {/* {errors.uploadFile && <div className=" bg-[#F26A5A] px-1 justify-center  flex items-center max-w-[80%] whitespace-nowrap rounded-lg  text-[#ffffff] mb-1 mt-1  mt-0">{errors.uploadFile}</div>} */}
                    </div>

                  </div>
                </div>

                <div className="flex justify-center items-center">
                  {loading ? <InfinitySpin visible={true}
                    // height="80"
                    width="200"
                    ariaLabel="InfinitySpin -loading"
                    wrapperStyle={{}}
                    wrapperClass="InfinitySpin -wrapper"
                    color="#F4442E" /> : <button
                      type="submit"
                      class=" h-[50px] w-full bg-[#F26A5A] hover:bg-[#F26A4A] text-white font-bold py-2 px-4 rounded"
                    >
                    Submit
                  </button>}

                </div>

              </form>
            </div>
          </div>
        </div>


      </div>

    </>
  );
}
