// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";

/*
 * @title Coin98 Broadcaster
 * @author Coin98 Labs
 * @notice Smart contract emit every event in Coin98 System
 */
contract Broadcaster is Ownable {
    /// Define project for handle event
    struct Project {
        bool isInit;
        mapping(address => bool) admins;
        mapping(address => bool) members;
    }

    /// Maping store value
    mapping(bytes32 => Project) private _projects;

    /// Declare Event base on GS1 standard
    event Event(
        bytes32 indexed project, /// Project key
        bytes indexed action, /// Action of event
        address from, /// True caller
        address indexed to, /// Smart contract emit
        bytes data /// Data of event
    );

    /// Project Registered Event
    event ProjectRegistered(bytes32 project);

    /// Set Admins of Project Event
    event SetAdmins(bytes32 project);

    /// Set Members of Project Event
    event SetMembers(bytes32 project);

    /// Set Member of Project Event
    event SetMember(bytes32 project, address member);

    modifier onlyInitProject(bytes32 projectKey) {
        require(isInitProject(projectKey), "Coin98 Broadcaster: Project not found");
        _;
    }

    modifier onlyAdmin(bytes32 projectKey) {
        require(isAdmin(projectKey, _msgSender()), "Coin98 Broadcaster: Unauthorized");
        _;
    }

    modifier onlyMember(bytes32 projectKey) {
        require(isMember(projectKey, _msgSender()), "Coin98 Broadcaster: Unauthorized");
        _;
    }

    /*
     * @title Register Project
     * @notice Registed new project in Coin98 System
     * @param project Key of project (Should not be use before)
     * @param initAdmins List init admins of Project (admin can update member list)
     * @param initMembers List init members of Project (member can emit event)
     */
    function registerProject(
        bytes32 projectKey,
        address[] memory initAdmins,
        address[] memory initMembers
    ) external onlyOwner {
        Project storage projectInfo = _projects[projectKey];
        require(!projectInfo.isInit, "Coin98 Broadcaster: Project already init");

        projectInfo.isInit = true;
        for (uint i = 0; i < initAdmins.length; i++) {
            projectInfo.admins[initAdmins[i]] = true;
        }

        for (uint i = 0; i < initMembers.length; i++) {
            projectInfo.members[initMembers[i]] = true;
        }

        emit ProjectRegistered(projectKey);
    }

    /*
     * @title Set Member
     * @notice Owner of contract or admin of project can update members list of Project
     * @param project Key of project
     * @param members List members
     * @param isActive member status
     */
    function setMembers(
        bytes32 projectKey,
        address[] memory members,
        bool isActive
    ) external onlyAdmin(projectKey) onlyInitProject(projectKey) {
        Project storage projectInfo = _projects[projectKey];
        require(projectInfo.isInit, "Coin98 Broadcaster: Project not found");

        for (uint i; i < members.length; i++) {
            projectInfo.members[members[i]] = isActive;
        }

        emit SetMembers(projectKey);
    }

    /*
     * @title Set Member
     * @notice Owner of contract or admin of project can update member of Project
     * @param project Key of project
     * @param member member
     * @param isActive member status
     */
    function setMember(
        bytes32 projectKey,
        address member,
        bool isActive
    ) external onlyAdmin(projectKey) onlyInitProject(projectKey) {
        Project storage projectInfo = _projects[projectKey];
        require(projectInfo.isInit, "Coin98 Broadcaster: Project not found");

        projectInfo.members[member] = isActive;

        emit SetMember(projectKey, member);
    }

    /*
     * @title Is Admin
     * @notice View function for check an address is admin of project
     * @param project Key of project
     * @param admin address of admin
     */
    function isAdmin(bytes32 projectKey, address admin) public view returns (bool) {
        Project storage projectInfo = _projects[projectKey];

        return projectInfo.admins[admin];
    }

    /*
     * @title Is Member
     * @notice View function for check an address is member of project
     * @param project Key of project
     * @param member address of member
     */
    function isMember(bytes32 projectKey, address member) public view returns (bool) {
        Project storage projectInfo = _projects[projectKey];

        return projectInfo.members[member];
    }

    /*
     * @title Is Member
     * @notice View function for check an address is member of project
     * @param project Key of project
     * @param member address of member
     */
    function isInitProject(bytes32 projectKey) public view returns (bool) {
        Project storage projectInfo = _projects[projectKey];
        return projectInfo.isInit;
    }

    /*
     * @title Broadcast event
     * @notice Member of project can broadcast an event
     * @param project Key of project
     * @param action Action of event
     * @param from Caller
     * @param to Smart contract handle logic
     * @param data Data of event
     */
    function broadcast(bytes32 projectKey, bytes memory action, address from, address to, bytes memory data) external {
        if (isInitProject(projectKey) && isMember(projectKey, _msgSender())) {
            emit Event(projectKey, action, from, to, data);
        }
    }
}
