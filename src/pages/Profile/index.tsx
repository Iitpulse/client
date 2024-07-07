import { useParams } from "react-router";
import styles from "./Profile.module.scss";
import MainLayout from "../../layouts/MainLayout";
import { useContext, useEffect, useState } from "react";
import { API_USERS } from "../../utils/api/config";
import { UserType, studentSchema } from "../../utils/schemas/user";
import { images } from "../../assets";
import { Button, DatePicker, Form, Input, Popconfirm, message, Select } from "antd";
import { performZodValidation, validateField } from "../../utils/schemas";
import { INDIAN_STATES } from "../../utils/constants";
import dayjs, { Dayjs } from "dayjs";
import { AuthContext } from "../../utils/auth/AuthContext";

const { profilePlaceholder } = images;

const Profile = () => {
  const { userId } = useParams();

  const [form] = Form.useForm();
  const [user, setUser] = useState<UserType | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  const userCtx = useContext(AuthContext);

  const conversionObject: any = {
    name: null,
    email: null,
    password: null,
    dob: {
      convert: (value: Dayjs) =>
        value ? dayjs(value).format("YYYY-MM-DD") : undefined,
      revert: (value: string) => (value ? dayjs(value, "YYYY-MM-DD") : null),
    },
    gender: null,
    roles: null,
    contact: {
      convert: (value: any) => parseInt(value),
      revert: (value: number) => value.toString(),
    },
    city: null,
    state: null,
    address: null,
    institute: null,
    isEmailVerified: null,
    isPhoneVerified: null,
    userType: () => "student",
    validity: {
      convert: (value: Dayjs[]) =>
        value
          ? {
              from: dayjs(value[0]).format("YYYY-MM-DD"),
              to: dayjs(value[1]).format("YYYY-MM-DD"),
            }
          : undefined,
      revert: (value: { from: string; to: string }) =>
        value
          ? [dayjs(value.from, "YYYY-MM-DD"), dayjs(value.to, "YYYY-MM-DD")]
          : [],
    },
    createdBy: null,
    createdAt: null,
    modifiedAt: null,
    parentDetails: {
      name: null,
      contact: {
        convert: (value: any) => parseInt(value),
        revert: (value: number) => value.toString(),
      },
    },
    batch: null,
    standard: {
      convert: (value: any) => parseInt(value),
      revert: (value: number) => value.toString(),
    },
    stream: null,
    medium: null,
    school: null,
    attemptedTests: null,

    //Field to be removed later
    promoCode: null,
  };

  async function onFinish(values: any) {
    const res = await API_USERS().post(`/student/create`, { ...values });
    message.success("User updated successfully");
    console.log(res);
  }

  function onFinishFailed(errorInfo: any) {
    message.error("Student creation failed");
    console.log("Failed:", {errorInfo});
  }

  async function validateForm() {
    try {
      const additionalValues = {
        userType: "student",
        createdBy: {
          id: userCtx?.currentUser?.id,
          userType: userCtx?.currentUser?.userType,
        },
        createdAt: dayjs().format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ (z)"),
        modifiedAt: dayjs().format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ (z)"),
        attemptedTests: [],
        isEmailVerified: false,
        isPhoneVerified: false,
      };
      console.log(additionalValues)
      const result = performZodValidation(
        form,
        conversionObject,
        studentSchema,
        additionalValues
      );
      console.log(result);
      await onFinish(result);
    } catch (error) {
      onFinishFailed(error);
    }
  }

  const [showTextField, setShowTextField] = useState(false);
  const [buttonText, setButtonText] = useState("Verify Email");
  const [Verified, setVerified] = useState(false);
  const [emailOtp, setEmailOtp] = useState("")

  const handleGenerate = async (e: any) => {
    e.preventDefault();
    message.loading({content: "Generating OTP", key:"generate_otp"});
    if (user?.email?.length === 0) return;
    const resEmail = user?.email?.toLowerCase();
    try {
      const response = await API_USERS().post(`/emailotp/generate`, {
        email: resEmail,
      });
      message.destroy("generate_otp")
      message.success({ content: response.data.message, key: "otp" });
    } catch (error:any){
      message.destroy("generate_otp")
      // message.error({content: error})
      message.error({content: error?.response?.data?.message})
      console.log({error});
      return;
    }

    setTimeout(() => {
      message.destroy("otp");
    }, 1000);
    setShowTextField(true);
  };

  const handleVerify = async (e: any) => {
    e.preventDefault();
    if(emailOtp.length!=6){
      message.error("OTP must contain 6 digits", 1);
      return;
    }
    const resEmail = user?.email.toLowerCase();
    try{
      const response = await API_USERS().post(`/emailotp/verify`, {
        email: resEmail,
        emailotp: emailOtp,
      });
      message.loading({ content: response.data.message, key: "verify" });
      console.log(response.data.message);
      if (response.status == 200) {
        setShowTextField(false);
        setVerified(true);
        setButtonText("Verified");
      }
    } catch(error:any) {
      message.error({content: error?.response?.data?.message});
      console.log(error?.response?.data?.message);
    }

    setTimeout(() => {
      message.destroy("verify");
    }, 1000);
  };


  function getRules(fieldName: any) {
    return [
      {
        validateTrigger: "onSubmit",
        validator: (_: any, value: any) =>
          validateField(fieldName, value, conversionObject, studentSchema),
      },
    ];
  }

  useEffect(() => {
    async function getUser() {
      try {
        const res = await API_USERS().get(`/users/${userId}`);
        if (res.data && res.data._id) {
          setUser(res.data);
          console.log(res.data);
        } else {
          setUser(null);
        }
        setIsDataLoading(false);
      } catch (error) {
        setIsDataLoading(false);
      }
    }
    if (userId) getUser();
  }, [userId]);
  const resetPasswordHandler = async () => {
    try {
      const res = await API_USERS().post(`/reset-password/request`, {
        email: user?.email,
      });
      if (res.status === 200) {
        message.success(res?.data?.message);
      } else {
        message.error(res?.data?.message);
      }
    } catch (err) {
      message.error("Something went wrong");
      console.log(err);
    }
  };
  return (
    <MainLayout name="Profile">
      {isDataLoading ? (
        <div>Loading...</div>
      ) : user ? (
        <div className={styles.container}>
          <div className={styles.profile}>
            <div className={styles.profileImage}>
              <img src={profilePlaceholder} alt="profile" />
            </div>
            <div className={styles.nameAndUserType}>
              <div>
                <h1>{user.name}</h1>
                <p>{user.userType}</p>
              </div>
              <div className={styles.actionBtn}>
                {isEditMode ? (
                  <div className={styles.saveAndCancel}>
                    <Button
                      onClick={() => {
                        document
                          .getElementById("profileUserForm")
                          ?.dispatchEvent(
                            new Event("submit", {
                              cancelable: true,
                              bubbles: true,
                            })
                          );
                      }}
                      htmlType="submit"
                    >
                      Save
                    </Button>
                    <Button type="primary" onClick={() => setIsEditMode(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className={styles.saveAndCancel}>
                    <Button type="primary" onClick={() => setIsEditMode(true)}>
                      Edit
                    </Button>
                    <Popconfirm
                      title="Reset Password"
                      description="Are you sure to Reset your password?"
                      onConfirm={() => {
                        resetPasswordHandler();
                      }}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button type="primary" danger>
                        Reset Password
                      </Button>
                    </Popconfirm>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className={styles.informationContainer}>
            <Form
              form={form}
              id="profileUserForm"
              onFinish={validateForm}
              initialValues={
                user && {
                  ...user,
                  // dob: conversionObject.dob.revert(user.dob),
                }
              }
              // onFinishFailed={handleFinishFailed}
            >
              {/* <Form.Item name="email" label="Email" rules={getRules("email")}>
                <Input
                  disabled={!isEditMode}
                  placeholder="Please enter an email"
                />
              </Form.Item> */}

              <div className={styles.information2}>
                <p className={styles.key}>Email:</p>
                <p className={styles.value}>{user.email}</p>
              </div>
              {!user.isEmailVerified &&(
                <>
                {
                  !(Verified || showTextField) &&
                  (
                    <div className={styles.information}>
                      <p className={styles.key2}>*Your Email isn't verified</p>
                      <Button type="primary" onClick={handleGenerate}>
                        Verify Email
                      </Button>
                    </div>
                  )
                }
                {
                  showTextField && (
                    <div className={styles.information}>
                      <Input
                        required
                        id="emailotp"
                        onChange={(e)=> setEmailOtp(e.target.value)}
                        placeholder="Email OTP"
                        style={{margin:"0",marginRight:"2vw",width: "15vw"}}
                      />
                      <Button onClick={handleVerify} type="primary">
                        Verify
                      </Button>
                    </div>
                  )
                }
                </>
              )}
              {/* <Form.Item
                name="contact"
                label="Contact"
                rules={getRules("contact")}
              >
                <Input
                  disabled={!isEditMode}
                  type="number"
                  placeholder="Please enter a contact"
                />
              </Form.Item> */}

              <div className={styles.information}>
                <p className={styles.key}>Contact:</p>
                {/* @ts-ignore */}
                <p className={styles.value}>{user.contact}</p>
              </div>

              <Form.Item name="city" label="City" rules={getRules("city")}>
                <Input
                  disabled={!isEditMode}
                  placeholder="Please enter a city"
                />
              </Form.Item>
              <Form.Item name="state" label="State" rules={getRules("state")}>
                <Select
                  style={{width:"30%"}}
                  disabled={!isEditMode}
                  placeholder="Select state"
                >
                  {
                    INDIAN_STATES.map((e)=>(
                      <Select.Option key={e} value={e}>{e}</Select.Option>
                    ))
                  }
                </Select>
              </Form.Item>
              <Form.Item
                name="address"
                label="Address"
                rules={getRules("address")}
              >
                <Input
                  disabled={!isEditMode}
                  placeholder="Please enter an address"
                />
              </Form.Item>
              <div className={styles.information}>
                <p className={styles.key}>Gender:</p>
                <p className={styles.value}>{user.gender}</p>
              </div>
              <div className={styles.information}>
                <p className={styles.key}>Date of Birth:</p>
                <p className={styles.value}>{user.dob}</p>
              </div>
              {/* <Form.Item
                name="parentDetails-name"
                label="Parent Name"
                rules={getRules("parentDetails-name")}
              >
                <Input
                  disabled={!isEditMode}
                  placeholder="Please enter a name"
                />
              </Form.Item> */}
              {/* <Form.Item
                name="parentDetails-contact"
                label="Parent Contact"
                rules={getRules("parentDetails-contact")}
              >
                <Input
                  type="number"
                  disabled={!isEditMode}
                  placeholder="Please enter a contact"
                />
              </Form.Item> */}

              <div className={styles.information}>
                <p className={styles.key}>Parent Name:</p>
                {/* @ts-ignore */}
                <p className={styles.value}>{user.parentDetails.name || "NA"}</p>
              </div>

              <div className={styles.information}>
                <p className={styles.key}>Parent Contact:</p>
                {/* @ts-ignore */}
                <p className={styles.value}>{user.parentDetails.contact || "NA"}</p>
              </div>

              <div className={styles.information}>
                <p className={styles.key}>Batch:</p>
                {/* @ts-ignore */}
                <p className={styles.value}>{user.batch || "NA"}</p>
              </div>
              <div className={styles.information}>
                <p className={styles.key}>Stream:</p>
                {/* @ts-ignore */}
                <p className={styles.value}>{user.stream || "NA"}</p>
              </div>
              <div className={styles.information}>
                <p className={styles.key}>Medium:</p>
                {/* @ts-ignore */}
                <p className={styles.value}>{user.medium || "NA"}</p>
              </div>
              <div className={styles.information}>
                <p className={styles.key}>School:</p>
                {/* @ts-ignore */}
                <p className={styles.value}>{user.school || "NA"}</p>
              </div>
              <div className={styles.information}>
                <p className={styles.key}>Validity:</p>
                {/* @ts-ignore */}
                <p className={styles.value}>{user?.validity.to.slice(0,10) || "NA"}</p>
              </div>

              {/* <div className={styles.information}>
                <p className={styles.key}>Roles:</p>
                <p className={styles.value}>
                  {user.roles?.map((role, index) => (
                    <span className={styles.role} key={index}>
                      {role?.id}
                    </span>
                  ))}
                </p>
              </div> */}
            </Form>
          </div>
        </div>
      ) : (
        <div className={styles.container}>User not found</div>
      )}
    </MainLayout>
  );
};

export default Profile;
