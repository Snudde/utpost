flowchart LR
  B[branch + commit] --> PR[pull request]
  PR --> Q[Kvalitet: lint · format · test]
  PR --> BU[Bygg]
  Q --> S{gröna?}
  BU --> S
  S -->|ja| M[merge]
  S -->|nej| F[fixa, pusha igen]