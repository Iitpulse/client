import { useContext, useEffect, useState } from "react";
import styles from "./Pattern.module.scss";
import { MUISimpleAutocomplete } from "../../components";
import { StyledMUITextField } from "../Users/components";
import { IPattern, ISection } from "../../utils/interfaces";
import { IconButton, Skeleton, Tooltip } from "@mui/material";
import tickCircle from "../../assets/icons/tick-circle.svg";
import { AuthContext } from "../../utils/auth/AuthContext";
import { usePermission } from "../../utils/contexts/PermissionsContext";
import { PERMISSIONS, TEST } from "../../utils/constants";
import { Error } from "../";
import { message } from "antd";
import { API_TESTS } from "../../utils/api/config";
import { TestContext } from "../../utils/contexts/TestContext";
import { useParams } from "react-router";
import { hasPatternPemissions } from "./utils";
import MainLayout from "../../layouts/MainLayout";
import Section from "./components/Section/Section";

const CreatePattern = () => {
  const isReadPermitted = usePermission(PERMISSIONS.PATTERN.READ);
  const isCreatePermitted = usePermission(PERMISSIONS.PATTERN.CREATE);
  const isUpdatePermitted = usePermission(PERMISSIONS.PATTERN.UPDATE);
  const [currentPattern, setCurrentPattern] = useState({} as IPattern);
  const [loading, setLoading] = useState<boolean>(false);
  // const isDeletePermitted = usePermission(PERMISSIONS.PATTERN.DELETE);

  // Get patternId from router
  const { patternId } = useParams();

  const { currentUser } = useContext(AuthContext);
  const { exams, subjects } = useContext(TestContext);
  // const [subjects, setSubjects] = useState([]);

  const [name, setName] = useState("");
  const [exam, setExam] = useState("");
  const [durationInMinutes, setDurationInMinutes] = useState("");

  useEffect(() => {
    async function fetchPattern() {
      setLoading(true);
      try {
        const res = await API_TESTS().get(`/pattern/single`, {
          params: {
            id: patternId,
          },
        });
        setCurrentPattern(res.data);
        const fetchedExam = exams?.find((exam) => exam.name === res.data.exam);
        setExam(res.data.exam);
      } catch (error) {
        console.log("FETCH_PATTERN_ERROR", error);
      }
      setLoading(false);
    }
    if (patternId) {
      fetchPattern();
    }
  }, [patternId]);

  useEffect(() => {
    if (currentPattern?.name) {
      setName(currentPattern.name);
      setExam(currentPattern.exam);
      setDurationInMinutes(String(currentPattern.durationInMinutes));
      setSections(currentPattern.sections);
    }
  }, [currentPattern]);
  useEffect(() => {
    console.log({ exam });
  });
  const [sections, setSections] = useState<Array<ISection>>([]);

  function handleChangeSection(id: string, data: any) {
    setSections(
      sections.map((section) =>
        section.id === id ? { ...section, ...data } : section
      )
    );
  }

  function handleClickAddNew() {
    setSections([
      ...sections,
      {
        ...TEST.SAMPLE_SECTION,
        id: `${Math.random() * 100}`,
        exam: exam,
        subject: "physics",
      },
    ]);
  }
  function handleDuplicateSection(id: string) {
    const section = sections.find((data) => data.id === id);
    if (!section) return;
    setSections([...sections, { ...section, id: `${Math.random() * 100}` }]);
    message.success("Duplicated successfully..");
  }
  function handleDeleteSection(id: string) {
    setSections(sections.filter((section) => section.id !== id));
    message.success("Deleted successfully..");
  }

  async function handleClickSubmit() {
    let areErrors: boolean = false;
    try {
      if (!currentUser) {
        message.error("User not found");
        return;
      }
      if (!durationInMinutes) {
        message.error("Duration is required");
        return;
      }
      if (!exam) {
        message.error("Exam is required");
        return;
      }
      if (!name) {
        message.error("Pattern Name is required");
        return;
      }

      if (!sections.length) {
        message.error("Atleast 1 section is required");
        return;
      }
      const pattern: IPattern = {
        id: `${currentUser.instituteId}_${name
          .replace(/ /g, "")
          .toUpperCase()}`,
        name,
        exam: exam,
        durationInMinutes: parseInt(durationInMinutes),
        sections: sections.map((sec, index) => {
          if (areErrors) return;
          if (!sec?.name) {
            message.error(
              <span>
                Section name is required for{" "}
                <strong>Section {index + 1}</strong>
              </span>,
              5
            );
            areErrors = true;
            return;
          }
          if (sec?.subSections?.length === 0) {
            message.error(
              <span>
                Atleast 1 Subsection is required for{" "}
                <strong>Section {index + 1}</strong>
              </span>,
              5
            );
            areErrors = true;
            return;
          }

          const totalQuestionsAndToBeAttemptedObject = sec?.subSections?.reduce(
            (acc: any, curr: any) => {
              if (areErrors) return acc;
              if (!curr?.name) {
                message.error(
                  <span>
                    Subsection name is required for{" "}
                    <strong>Subsection {index + 1}</strong> inside Section{" "}
                    <strong>{sec.name}</strong>
                  </span>,
                  5
                );
                areErrors = true;
                return acc;
              }
              if (curr?.totalQuestions < curr?.toBeAttempted) {
                console.log("This is the error");
                message.error(
                  <span>
                    Questions to be attempted cannot be greater than total
                    questions check Subsection <strong>{curr.name}</strong>{" "}
                    inside Section <strong>{sec.name}</strong>
                  </span>,
                  5
                );
                areErrors = true;

                return acc;
              }
              if (curr?.totalQuestions < 1) {
                message.error(
                  <span>
                    Total questions cannot be less than 1 for Subsection{" "}
                    <strong>{curr.name}</strong> inside Section{" "}
                    <strong>{sec.name}</strong>
                  </span>,
                  5
                );
                areErrors = true;

                return acc;
              }
              if (curr?.toBeAttempted < 1) {
                message.error(
                  <span>
                    Questions to be attempted cannot be less than 1 for
                    Subsection <strong>{curr.name}</strong> inside Section{" "}
                    <strong>{sec.name}</strong>
                  </span>,
                  5
                );
                areErrors = true;
                return acc;
              }
              acc.totalQuestions += curr.totalQuestions || 1;
              acc.toBeAttempted += curr.toBeAttempted || 1;
              return acc;
            },
            {
              totalQuestions: 0,
              toBeAttempted: 0,
            }
          );

          return {
            ...sec,
            ...totalQuestionsAndToBeAttemptedObject,
            exam: exam,
          };
        }),
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        createdBy: {
          userType: currentUser.userType || "",
          id: currentUser.id || "",
        },
        usedIn: [],
      };
      if (areErrors) return;
      //check if url contains new or edit
      if (patternId) {
        await API_TESTS().patch(`/pattern/update`, pattern, {
          params: { id: patternId },
        });
        message.success("Pattern updated successfully");
      } else {
        await API_TESTS().post(`/pattern/create`, pattern);
        message.success("Pattern created successfully");
      }
      // const res = await API_TESTS().post(`/pattern/create`, pattern);
      // message.success("Pattern created successfully");
      // console.log({ res });
    } catch (error) {
      message.error("Error creating pattern");
    }
  }

  return (
    <MainLayout name="Create Pattern">
      {hasPatternPemissions(
        {
          isReadPermitted,
          isCreatePermitted,
          isUpdatePermitted,
        },
        patternId
      ) ? (
        loading ? (
          <>
            <Skeleton variant="rectangular" width={"100%"} height={100} />
            <Skeleton variant="rectangular" width={"100%"} height={100} />
          </>
        ) : (
          <>
            <section className={styles.container}>
              <div className={styles.header}>
                <StyledMUITextField
                  value={name}
                  label="Name"
                  onChange={(e: any) => setName(e.target.value)}
                />
                <StyledMUITextField
                  value={durationInMinutes}
                  type="number"
                  label="Duration (in Minutes)"
                  onChange={(e: any) => setDurationInMinutes(e.target.value)}
                />
                <MUISimpleAutocomplete
                  label="Exam"
                  onChange={setExam}
                  options={
                    exams?.map((exam) => ({
                      name: exam.name,
                      value: exam.name,
                      id: exam._id,
                    })) || []
                  }
                  value={exam}
                />
              </div>
              <div className={styles.sections}>
                {sections.map((section, i) => (
                  <Section
                    key={i}
                    handleDuplicateSection={handleDuplicateSection}
                    section={section}
                    setSection={handleChangeSection}
                    handleDeleteSection={handleDeleteSection}
                    index={i}
                    subjects={subjects}
                  />
                ))}
              </div>
              <div className={styles.addSection} onClick={handleClickAddNew}>
                <p>+ Add New Section</p>
              </div>
              <Tooltip title="Save Pattern" placement="top">
                <IconButton
                  className={styles.savePatternBtn}
                  onClick={handleClickSubmit}
                >
                  <img src={tickCircle} alt="save-pattern" />
                </IconButton>
              </Tooltip>
            </section>
          </>
        )
      ) : (
        <Error />
      )}
    </MainLayout>
  );
};

export default CreatePattern;
