import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Layout, Typography, Input, Form, Select, Checkbox } from "antd";
import "antd/dist/antd.css";
import "./app.css";

const { TextArea } = Input;
const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const WhiteListBuilder = () => {
  const [packageJSON, setPackageJSON] = useState(
    JSON.stringify(
      {
        dependencies: {
          react: "^16.13.1",
          "react-dom": "^16.13.1",
        },
        devDependencies: {
          jest: "^25.3.0",
        },
      },
      null,
      2
    )
  );
  const [whiteListCode, setWhiteListCode] = useState("");
  const [lockVersion, setLockVersions] = useState(false);

  useEffect(() => {
    try {
      const pkg = JSON.parse(packageJSON);
      const makeWhiteList = (deps, type) => {
        if (deps) {
          const checkList =
            Object.keys(deps).length > 0
              ? "," +
                Object.keys(deps)
                  .map(
                    (k) => `
  DependencyIdent \\= '${k}'`
                  )
                  .join(", ")
              : "";
          return `gen_enforced_dependency(WorkspaceCwd, DependencyIdent, null, ${type}) :-
  workspace_has_dependency(WorkspaceCwd, DependencyIdent, _, ${type})${checkList}.`;
        } else {
          return "";
        }
      };

      const makeVersionLocks = (deps, type) =>
        lockVersion
          ? Object.entries(deps)
              .map(
                ([
                  name,
                  version,
                ]) => `gen_enforced_dependency(WorkspaceCwd, '${name}', '${version}', ${type}) :-
  workspace_has_dependency(WorkspaceCwd, '${name}', _, ${type}).`
              )
              .join("\n")
          : "";

      setWhiteListCode(
        [
          makeWhiteList(pkg.dependencies || {}, "dependencies"),
          makeWhiteList(pkg.devDependencies || {}, "devDependencies"),
          makeVersionLocks(pkg.dependencies || {}, "dependencies"),
          makeVersionLocks(pkg.devDependencies || {}, "devDependencies"),
        ]
          .filter((t) => t.length > 0)
          .join("\n\n")
      );
    } catch (e) {
      whiteListCode = "Encountered an error parsing the package.json";
    }
  }, [packageJSON, lockVersion]);

  return (
    <>
      <Paragraph>
        So, you want to make sure that nobody depends on a module that you don't
        know about. Ok.
      </Paragraph>
      <Paragraph>
        Paste in your 'ideal' <Text code>package.json</Text> below and we'll
        make whitelist rules for you.
      </Paragraph>
      <TextArea
        value={packageJSON}
        onChange={(evt) => setPackageJSON(evt.target.value)}
        autoSize={{ minRows: 5, maxRows: 15 }}
      />
      <Checkbox
        onChange={(evt) => setLockVersions(evt.target.checked)}
        checked={lockVersion}
      >
        Lock versions
      </Checkbox>
      <Paragraph>Here are your rules</Paragraph>
      <Paragraph code copyable className="code-sample">
        {whiteListCode}
      </Paragraph>
    </>
  );
};

const RuleBuilder = () => {
  const [state, setState] = useState({
    moduleName: "lodash",
    version: "",
    versionType: "null",
    dependencyType: "_",
    projectsNamed: "",
  });

  const projectName =
    state.projectsNamed.trim().length === 0
      ? "WorkspaceCwd"
      : `'${state.projectsNamed}'`;

  const version =
    state.versionType === "null" ? state.versionType : `'${state.version}'`;

  const includesCheck =
    state.versionType === "null"
      ? ""
      : `
  workspace_has_dependency(${projectName}, '${state.moduleName}', _, ${state.dependencyType})`;

  const additionalChecks = includesCheck
    ? " :- " + [includesCheck].filter((t) => t.length > 0).join(",")
    : "";

  const prolog = `gen_enforced_dependency(${projectName}, '${state.moduleName}', ${version}, ${state.dependencyType})${additionalChecks}.`;

  return (
    <>
      <Form.Item label="Module">
        <Input
          placeholder="Module name"
          value={state.moduleName}
          style={{ width: "15%" }}
          onChange={(evt) =>
            setState({
              ...state,
              moduleName: evt.target.value,
            })
          }
        />
      </Form.Item>
      <Form.Item label="Version">
        <Input.Group compact>
          <Select
            value={state.versionType}
            style={{ width: "25%" }}
            onChange={(versionType) =>
              setState({
                ...state,
                versionType,
              })
            }
          >
            <Option value="null">None (Don't use {state.moduleName})</Option>
            <Option value="version">Specific version</Option>
          </Select>
          {state.versionType !== "null" && (
            <Input
              placeholder="Required version"
              value={state.version}
              style={{ width: "10%" }}
              onChange={(evt) =>
                setState({
                  ...state,
                  version: evt.target.value,
                })
              }
            />
          )}
        </Input.Group>
      </Form.Item>
      <Form.Item label="Dependency Type">
        <Select
          value={state.dependencyType}
          style={{ width: "25%" }}
          onChange={(dependencyType) =>
            setState({
              ...state,
              dependencyType,
            })
          }
        >
          <Option value="_">Any</Option>
          <Option value="dependencies">Direct Dependency</Option>
          <Option value="devDependencies">Development Dependency</Option>
          <Option value="peerDependencies">Peer Dependency</Option>
        </Select>
      </Form.Item>
      <Form.Item label="On projects named">
        <Input
          placeholder="Project name"
          value={state.projectsNamed}
          style={{ width: "15%" }}
          onChange={(evt) =>
            setState({
              ...state,
              projectsNamed: evt.target.value,
            })
          }
        />
      </Form.Item>
      <Paragraph>Here is your rule</Paragraph>
      <Paragraph code copyable className="code-sample">
        {prolog}
      </Paragraph>
    </>
  );
};

const App = () => (
  <Layout>
    <Header>
      <div class="container">
        <Title style={{ color: "white" }}>Yarn v2 (Berry) Rule Builder</Title>
      </div>
    </Header>
    <Content style={{ padding: "1em" }} className="container">
      <Paragraph>
        Wan't to use
        <Text code strong>
          yarn constraints
        </Text>
        in Yarn v2 (Berry) but aren't vibing on the whole Prolog thing? We're
        vibing with that.
      </Paragraph>
      <Paragraph>
        Use the form below to tell us what it is you want and we'll write the
        rule for you and you can paste it into the
        <Text code copyable strong>
          constraints.pro
        </Text>
        file. Sound like a plan?
      </Paragraph>
      <Title>The Rule Builder</Title>
      <RuleBuilder />
      <Title>The Whitelist Builder</Title>
      <WhiteListBuilder />
      <Title>Not That Motivated?</Title>
      <Paragraph>
        Yeah.&nbsp;
        <a
          href="https://media.giphy.com/media/hiEs8sF8KoYnu/giphy.gif"
          target="_blank"
        >
          That's ok
        </a>
        . Here are some canned recipes you can just use as-is, or with a little
        tweaking.
      </Paragraph>
      <Title level={3}>Projects shouldn't have conflicting versions</Title>
      <Paragraph>
        Can't take credit for this one. It was&nbsp;
        <a href="https://yarnpkg.com/features/constraints" target="_blank">
          in the docs
        </a>
        . But it's super freaking handy and you should probably have it in
        your&nbsp;
        <Text code copyable strong>
          constraints.pro
        </Text>
        &nbsp;file.
      </Paragraph>
      <Paragraph code copyable className="code-sample">
        {`gen_enforced_dependency(WorkspaceCwd, DependencyIdent, DependencyRange2, DependencyType) :-
  workspace_has_dependency(WorkspaceCwd, DependencyIdent, DependencyRange, DependencyType),
  workspace_has_dependency(OtherWorkspaceCwd, DependencyIdent, DependencyRange2, DependencyType2),
  DependencyRange \= DependencyRange2.`}
      </Paragraph>
      <Title level={3}>
        Don't use <Text italic>lodash</Text> at any version
      </Title>
      <Paragraph>
        Not a
        <Text code strong>
          lodash
        </Text>
        hater? No problem. Just replace
        <Text code strong>
          lodash
        </Text>
        with your hated module and get your hate on.
      </Paragraph>
      <Paragraph code copyable className="code-sample">
        {`gen_enforced_dependency(WorkspaceCwd, 'lodash', null, DependencyType) :-
  workspace_has_dependency(WorkspaceCwd, 'lodash', _, DependencyType).`}
      </Paragraph>
      <Title level={3}>Require a license field</Title>
      <Paragraph>
        This really applies to any field in
        <Text code strong>
          package.json
        </Text>
        . Just change the second argument to whatever the field name is, and the
        third argument to the value you want to enforce.
      </Paragraph>
      <Paragraph code copyable className="code-sample">
        {`gen_enforced_field(WorkspaceCwd, 'license', 'MIT').`}
      </Paragraph>
      <Title>How Do I Run This?</Title>
      <Paragraph>
        Oh, right. Create a file in the root directory called
        <Text code copyable strong>
          constraints.pro
        </Text>
        . Then copy this stuff in there and run
        <Text code copyable strong>
          yarn constraints
        </Text>
        .
      </Paragraph>
      <Paragraph>
        That should do the trick. Oh, and
        <Text code copyable strong>
          %
        </Text>
        at the&nbsp;
        <a
          href="https://media.giphy.com/media/3ohzdLQUbKEu47o9Ww/giphy.gif"
          target="blank"
        >
          beginning of a line is a Prolog comment
        </a>
        . You know, might be good throwing a comment in there, or two.
      </Paragraph>
      <Title>Goes without saying but...</Title>
      <Paragraph>
        If through some craziness you manage to mess up your system or your code
        by doing anything you got from this site then sugar,
        <Text strong>that's on you</Text>.
      </Paragraph>
    </Content>
  </Layout>
);

ReactDOM.render(<App />, document.getElementById("app"));
