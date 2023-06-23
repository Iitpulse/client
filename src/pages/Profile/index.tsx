import { useParams } from "react-router";
import styles from "./Profile.module.scss";
import MainLayout from "../../layouts/MainLayout";
import { useContext, useEffect, useState } from "react";
import { API_USERS } from "../../utils/api/config";
import { UserType, studentSchema } from "../../utils/schemas/user";
import { images } from "../../assets";
import { Button, DatePicker, Form, Input, message } from "antd";
import { performZodValidation, validateField } from "../../utils/schemas";

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
    joiningCode: null,
  };

  async function onFinish(values: any) {
    // const res = await API_USERS().post(`/student/create`, { ...values });
    message.success("User updated successfully");
    // console.log(res);
  }

  function onFinishFailed(errorInfo: any) {
    message.error("Student creation failed");
    console.log("Failed:", errorInfo);
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
              <h1>{user.name}</h1>
              <p>{user.userType}</p>
            </div>
            <div className={styles.actionBtn}>
              {isEditMode ? (
                <div className={styles.saveAndCancel}>
                  <Button
                    onClick={() => {
                      document.getElementById("profileUserForm")?.dispatchEvent(
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
                <Button type="primary" onClick={() => setIsEditMode(true)}>
                  Edit
                </Button>
              )}
            </div>
          </div>
          <div className={styles.informationContainer}>
            <Form
              form={form}
              id="studentUserForm"
              onFinish={validateForm}
              initialValues={
                user && {
                  ...user,
                  // dob: conversionObject.dob.revert(user.dob),
                }
              }
              // onFinishFailed={handleFinishFailed}
            >
              <Form.Item name="email" label="Email" rules={getRules("email")}>
                <Input
                  disabled={!isEditMode}
                  placeholder="Please enter an email"
                />
              </Form.Item>

              <Form.Item
                name="contact"
                label="Contact"
                rules={getRules("contact")}
              >
                <Input
                  disabled={!isEditMode}
                  type="number"
                  placeholder="Please enter a contact"
                />
              </Form.Item>
              <Form.Item name="city" label="City" rules={getRules("city")}>
                <Input
                  disabled={!isEditMode}
                  placeholder="Please enter a city"
                />
              </Form.Item>
              <Form.Item name="state" label="State" rules={getRules("state")}>
                <Input
                  disabled={!isEditMode}
                  placeholder="Please enter a state"
                />
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
              <Form.Item
                name="parentDetails-name"
                label="Parent Name"
                rules={getRules("parentDetails-name")}
              >
                <Input
                  disabled={!isEditMode}
                  placeholder="Please enter a name"
                />
              </Form.Item>
              <Form.Item
                name="parentDetails-contact"
                label="Parent Contact"
                rules={getRules("parentDetails-contact")}
              >
                <Input
                  type="number"
                  disabled={!isEditMode}
                  placeholder="Please enter a contact"
                />
              </Form.Item>
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
                <p className={styles.value}>{user.medium || "NA"}</p>
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
